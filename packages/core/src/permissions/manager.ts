import { minimatch } from 'minimatch';
import type {
  PermissionConfig,
  PermissionAction,
  PermissionCheckResult,
  PermissionPromptFn,
  ToolPermissions,
  PermissionRule,
} from './types.js';
import { loadSettings, DEFAULT_PERMISSIONS } from './config.js';

/**
 * Manages permission checks for tool execution
 */
export class PermissionManager {
  private config: PermissionConfig;
  private promptFn: PermissionPromptFn | null = null;
  private sessionAllowed: Set<string> = new Set();

  constructor(config?: PermissionConfig) {
    this.config = config ?? loadSettings().permissions;
  }

  /**
   * Set the prompt function for interactive permission requests
   */
  setPromptFn(fn: PermissionPromptFn): void {
    this.promptFn = fn;
  }

  /**
   * Check if an action is allowed
   * @param tool Tool name
   * @param input Tool input (e.g., file path for read, command for bash)
   * @returns Whether the action is allowed
   */
  async check(tool: string, input?: string): Promise<boolean> {
    const result = this.evaluate(tool, input);

    if (result.action === 'allow') {
      return true;
    }

    if (result.action === 'deny') {
      return false;
    }

    // action === 'ask'
    // Check if user already allowed this session
    const key = this.getSessionKey(tool, input);
    if (this.sessionAllowed.has(key)) {
      return true;
    }

    // If no prompt function, deny by default
    if (!this.promptFn) {
      return false;
    }

    // Ask user
    const allowed = await this.promptFn(tool, input || '', result.reason);
    if (allowed) {
      this.sessionAllowed.add(key);
    }

    return allowed;
  }

  /**
   * Evaluate permission without prompting
   */
  evaluate(tool: string, input?: string): PermissionCheckResult {
    const toolConfig = this.getToolConfig(tool);

    // Check rules first (first match wins)
    if (toolConfig.rules && input) {
      // Check deny rules first
      for (const rule of toolConfig.rules) {
        if (rule.action === 'deny' && this.matchPattern(input, rule.pattern)) {
          return {
            allowed: false,
            action: 'deny',
            matchedRule: rule,
            reason: `Blocked by deny rule: ${rule.pattern}`,
          };
        }
      }

      // Check allow rules
      for (const rule of toolConfig.rules) {
        if (rule.action === 'allow' && this.matchPattern(input, rule.pattern)) {
          return {
            allowed: true,
            action: 'allow',
            matchedRule: rule,
            reason: `Allowed by rule: ${rule.pattern}`,
          };
        }
      }

      // Check ask rules
      for (const rule of toolConfig.rules) {
        if (rule.action === 'ask' && this.matchPattern(input, rule.pattern)) {
          return {
            allowed: false,
            action: 'ask',
            matchedRule: rule,
            reason: `Requires approval: ${rule.pattern}`,
          };
        }
      }
    }

    // Fall back to default action
    return {
      allowed: toolConfig.default === 'allow',
      action: toolConfig.default,
      reason: `Default action for ${tool}: ${toolConfig.default}`,
    };
  }

  /**
   * Allow an action for the current session
   */
  allowForSession(tool: string, input?: string): void {
    const key = this.getSessionKey(tool, input);
    this.sessionAllowed.add(key);
  }

  /**
   * Clear session-specific allowances
   */
  clearSession(): void {
    this.sessionAllowed.clear();
  }

  /**
   * Get configuration for a specific tool
   */
  private getToolConfig(tool: string): ToolPermissions {
    const config = this.config[tool as keyof PermissionConfig];
    return config || { default: 'ask' };
  }

  /**
   * Match input against a pattern
   */
  private matchPattern(input: string, pattern: string): boolean {
    // Use minimatch for glob-style matching
    return minimatch(input, pattern, {
      nocase: false,
      dot: true,
    });
  }

  /**
   * Generate a session key for caching allowed actions
   */
  private getSessionKey(tool: string, input?: string): string {
    if (!input) return tool;

    // For bash, just use the command prefix
    if (tool === 'bash') {
      const parts = input.trim().split(/\s+/);
      const cmd = parts[0] || '';
      // Include first argument for more specific matching
      if (parts.length > 1) {
        return `${tool}:${cmd}:${parts[1]}`;
      }
      return `${tool}:${cmd}`;
    }

    // For file operations, use the path
    return `${tool}:${input}`;
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(config: Partial<PermissionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PermissionConfig {
    return { ...this.config };
  }
}

// Singleton instance
let defaultManager: PermissionManager | null = null;

/**
 * Get the default permission manager instance
 */
export function getPermissionManager(): PermissionManager {
  if (!defaultManager) {
    defaultManager = new PermissionManager();
  }
  return defaultManager;
}

/**
 * Create a new permission manager with custom config
 */
export function createPermissionManager(config?: PermissionConfig): PermissionManager {
  return new PermissionManager(config);
}
