import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import type { PermissionConfig, ToolPermissions } from './types.js';

const CONFIG_PATH = join(homedir(), '.config', '10x', 'settings.json');

/**
 * Default permissions configuration
 */
export const DEFAULT_PERMISSIONS: PermissionConfig = {
  // Safe read-only tools - allow by default
  read: {
    default: 'allow',
  },
  glob: {
    default: 'allow',
  },
  grep: {
    default: 'allow',
  },

  // Write operations - ask by default
  write: {
    default: 'ask',
  },
  edit: {
    default: 'ask',
  },

  // Bash - complex rules
  bash: {
    default: 'ask',
    rules: [
      // Safe commands - allow
      { pattern: 'git status', action: 'allow' },
      { pattern: 'git diff*', action: 'allow' },
      { pattern: 'git log*', action: 'allow' },
      { pattern: 'git branch*', action: 'allow' },
      { pattern: 'git show*', action: 'allow' },
      { pattern: 'npm test*', action: 'allow' },
      { pattern: 'npm run *', action: 'allow' },
      { pattern: 'npm install*', action: 'allow' },
      { pattern: 'bun *', action: 'allow' },
      { pattern: 'bun test*', action: 'allow' },
      { pattern: 'bunx *', action: 'allow' },
      { pattern: 'pnpm *', action: 'allow' },
      { pattern: 'yarn *', action: 'allow' },
      { pattern: 'ls *', action: 'allow' },
      { pattern: 'ls', action: 'allow' },
      { pattern: 'cat *', action: 'allow' },
      { pattern: 'head *', action: 'allow' },
      { pattern: 'tail *', action: 'allow' },
      { pattern: 'wc *', action: 'allow' },
      { pattern: 'pwd', action: 'allow' },
      { pattern: 'which *', action: 'allow' },
      { pattern: 'echo *', action: 'allow' },
      { pattern: 'date', action: 'allow' },
      { pattern: 'whoami', action: 'allow' },
      { pattern: 'hostname', action: 'allow' },
      { pattern: 'uname *', action: 'allow' },
      { pattern: 'rg *', action: 'allow' },
      { pattern: 'fd *', action: 'allow' },
      { pattern: 'find *', action: 'allow' },
      { pattern: 'tree *', action: 'allow' },
      { pattern: 'tree', action: 'allow' },
      { pattern: 'du *', action: 'allow' },
      { pattern: 'df *', action: 'allow' },
      { pattern: 'env', action: 'allow' },
      { pattern: 'node -v', action: 'allow' },
      { pattern: 'node --version', action: 'allow' },
      { pattern: 'python --version', action: 'allow' },
      { pattern: 'python3 --version', action: 'allow' },
      { pattern: 'cargo *', action: 'allow' },
      { pattern: 'rustc *', action: 'allow' },
      { pattern: 'go *', action: 'allow' },
      { pattern: 'make*', action: 'allow' },
      { pattern: 'cmake*', action: 'allow' },
      { pattern: 'tsc*', action: 'allow' },
      { pattern: 'eslint*', action: 'allow' },
      { pattern: 'prettier*', action: 'allow' },
      { pattern: 'jest*', action: 'allow' },
      { pattern: 'vitest*', action: 'allow' },
      { pattern: 'pytest*', action: 'allow' },

      // Dangerous commands - deny
      { pattern: 'sudo *', action: 'deny' },
      { pattern: 'su *', action: 'deny' },
      { pattern: 'rm -rf /*', action: 'deny' },
      { pattern: 'rm -rf ~/*', action: 'deny' },
      { pattern: 'rm -rf $HOME/*', action: 'deny' },
      { pattern: 'rm -rf /', action: 'deny' },
      { pattern: 'rm -rf ~', action: 'deny' },
      { pattern: 'chmod 777 *', action: 'deny' },
      { pattern: 'chmod -R 777 *', action: 'deny' },
      { pattern: ': > /*', action: 'deny' },
      { pattern: '> /*', action: 'deny' },
      { pattern: 'dd if=*', action: 'deny' },
      { pattern: 'mkfs*', action: 'deny' },
      { pattern: 'shutdown*', action: 'deny' },
      { pattern: 'reboot*', action: 'deny' },
      { pattern: 'halt*', action: 'deny' },
      { pattern: 'poweroff*', action: 'deny' },
      { pattern: ':(){:|:&};:', action: 'deny' },
      { pattern: 'wget * | bash*', action: 'deny' },
      { pattern: 'curl * | bash*', action: 'deny' },
      { pattern: 'wget * | sh*', action: 'deny' },
      { pattern: 'curl * | sh*', action: 'deny' },
    ],
  },
};

/**
 * Load settings from config file
 */
export function loadSettings(): { permissions: PermissionConfig } {
  if (!existsSync(CONFIG_PATH)) {
    return { permissions: DEFAULT_PERMISSIONS };
  }

  try {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    const settings = JSON.parse(content);

    // Merge with defaults
    return {
      permissions: mergePermissions(DEFAULT_PERMISSIONS, settings.permissions || {}),
    };
  } catch (error) {
    // If file is corrupted or invalid, use defaults
    console.error('Warning: Failed to load settings, using defaults');
    return { permissions: DEFAULT_PERMISSIONS };
  }
}

/**
 * Save settings to config file
 */
export function saveSettings(settings: { permissions: PermissionConfig }): void {
  const dir = dirname(CONFIG_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(CONFIG_PATH, JSON.stringify(settings, null, 2));
}

/**
 * Merge user permissions with defaults
 */
function mergePermissions(
  defaults: PermissionConfig,
  user: Partial<PermissionConfig>
): PermissionConfig {
  const result: PermissionConfig = { ...defaults };

  for (const tool of ['read', 'write', 'edit', 'glob', 'grep', 'bash'] as const) {
    if (user[tool]) {
      result[tool] = mergeToolPermissions(defaults[tool] || { default: 'ask' }, user[tool]!);
    }
  }

  return result;
}

/**
 * Merge tool-specific permissions
 */
function mergeToolPermissions(
  defaults: ToolPermissions,
  user: Partial<ToolPermissions>
): ToolPermissions {
  return {
    default: user.default ?? defaults.default,
    rules: user.rules
      ? [...(user.rules || []), ...(defaults.rules || [])]
      : defaults.rules,
  };
}

/**
 * Get the config file path
 */
export function getConfigPath(): string {
  return CONFIG_PATH;
}
