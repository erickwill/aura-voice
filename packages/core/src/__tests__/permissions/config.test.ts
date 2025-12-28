import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import {
  loadSettings,
  saveSettings,
  getConfigPath,
  DEFAULT_PERMISSIONS,
} from '../../permissions/config.js';

// We'll use the actual config path for these tests, but save/restore any existing config
const CONFIG_PATH = getConfigPath();
const BACKUP_PATH = CONFIG_PATH + '.test-backup';

describe('permissions/config', () => {
  let originalConfig: string | null = null;

  beforeEach(() => {
    // Backup existing config if present
    if (existsSync(CONFIG_PATH)) {
      const { readFileSync } = require('fs');
      originalConfig = readFileSync(CONFIG_PATH, 'utf-8');
      rmSync(CONFIG_PATH);
    }
  });

  afterEach(() => {
    // Restore original config
    if (originalConfig !== null) {
      const dir = dirname(CONFIG_PATH);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(CONFIG_PATH, originalConfig);
      originalConfig = null;
    } else if (existsSync(CONFIG_PATH)) {
      rmSync(CONFIG_PATH);
    }
  });

  describe('loadSettings', () => {
    test('returns defaults if no config file exists', () => {
      const settings = loadSettings();

      expect(settings.permissions).toBeDefined();
      expect(settings.permissions.read).toBeDefined();
      expect(settings.permissions.write).toBeDefined();
      expect(settings.permissions.bash).toBeDefined();
    });

    test('parses config file correctly', () => {
      const customConfig = {
        permissions: {
          read: { default: 'deny' },
        },
      };
      mkdirSync(dirname(CONFIG_PATH), { recursive: true });
      writeFileSync(CONFIG_PATH, JSON.stringify(customConfig));

      const settings = loadSettings();

      expect(settings.permissions.read.default).toBe('deny');
    });

    test('merges with defaults for missing tools', () => {
      const customConfig = {
        permissions: {
          read: { default: 'deny' },
        },
      };
      mkdirSync(dirname(CONFIG_PATH), { recursive: true });
      writeFileSync(CONFIG_PATH, JSON.stringify(customConfig));

      const settings = loadSettings();

      // Custom value preserved
      expect(settings.permissions.read.default).toBe('deny');
      // Defaults preserved for other tools
      expect(settings.permissions.write.default).toBe('ask');
      expect(settings.permissions.glob.default).toBe('allow');
    });

    test('handles corrupted config file', () => {
      mkdirSync(dirname(CONFIG_PATH), { recursive: true });
      writeFileSync(CONFIG_PATH, 'not valid json');

      const settings = loadSettings();

      // Should fall back to defaults
      expect(settings.permissions).toBeDefined();
      expect(settings.permissions.read.default).toBe('allow');
    });
  });

  describe('saveSettings', () => {
    test('creates config file', () => {
      const settings = { permissions: DEFAULT_PERMISSIONS };

      saveSettings(settings);

      expect(existsSync(CONFIG_PATH)).toBe(true);
    });

    test('creates parent directories', () => {
      // Temporarily remove the config directory
      const dir = dirname(CONFIG_PATH);
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true });
      }

      const settings = { permissions: DEFAULT_PERMISSIONS };
      saveSettings(settings);

      expect(existsSync(CONFIG_PATH)).toBe(true);
    });

    test('writes valid JSON', () => {
      const settings = { permissions: DEFAULT_PERMISSIONS };
      saveSettings(settings);

      const { readFileSync } = require('fs');
      const content = readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.permissions).toBeDefined();
    });
  });

  describe('getConfigPath', () => {
    test('returns correct path', () => {
      const path = getConfigPath();

      expect(path).toContain('.config');
      expect(path).toContain('10x');
      expect(path).toContain('settings.json');
    });
  });

  describe('DEFAULT_PERMISSIONS', () => {
    test('has expected structure', () => {
      expect(DEFAULT_PERMISSIONS.read).toBeDefined();
      expect(DEFAULT_PERMISSIONS.write).toBeDefined();
      expect(DEFAULT_PERMISSIONS.edit).toBeDefined();
      expect(DEFAULT_PERMISSIONS.glob).toBeDefined();
      expect(DEFAULT_PERMISSIONS.grep).toBeDefined();
      expect(DEFAULT_PERMISSIONS.bash).toBeDefined();
    });

    test('read/glob/grep are allow by default', () => {
      expect(DEFAULT_PERMISSIONS.read.default).toBe('allow');
      expect(DEFAULT_PERMISSIONS.glob.default).toBe('allow');
      expect(DEFAULT_PERMISSIONS.grep.default).toBe('allow');
    });

    test('write/edit are ask by default', () => {
      expect(DEFAULT_PERMISSIONS.write.default).toBe('ask');
      expect(DEFAULT_PERMISSIONS.edit.default).toBe('ask');
    });

    test('bash has rules defined', () => {
      expect(DEFAULT_PERMISSIONS.bash.rules).toBeDefined();
      expect(DEFAULT_PERMISSIONS.bash.rules!.length).toBeGreaterThan(0);
    });

    test('bash has safe command allow rules', () => {
      const allowRules = DEFAULT_PERMISSIONS.bash.rules!.filter(r => r.action === 'allow');
      const patterns = allowRules.map(r => r.pattern);

      expect(patterns).toContain('git status');
      expect(patterns).toContain('npm test*');
      expect(patterns).toContain('bun *');
    });

    test('bash has dangerous command deny rules', () => {
      const denyRules = DEFAULT_PERMISSIONS.bash.rules!.filter(r => r.action === 'deny');
      const patterns = denyRules.map(r => r.pattern);

      expect(patterns).toContain('sudo *');
      expect(patterns).toContain('rm -rf /');
    });
  });
});
