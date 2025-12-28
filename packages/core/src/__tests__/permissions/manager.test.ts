import { describe, expect, test, beforeEach, mock } from 'bun:test';
import {
  PermissionManager,
  createPermissionManager,
} from '../../permissions/manager.js';
import type { PermissionConfig } from '../../permissions/types.js';

describe('PermissionManager', () => {
  let manager: PermissionManager;

  const testConfig: PermissionConfig = {
    read: { default: 'allow' },
    write: { default: 'ask' },
    edit: { default: 'ask' },
    glob: { default: 'allow' },
    grep: { default: 'allow' },
    bash: {
      default: 'ask',
      rules: [
        { pattern: 'git *', action: 'allow' },
        { pattern: 'git status', action: 'allow' },
        { pattern: 'npm test*', action: 'allow' },
        { pattern: 'sudo *', action: 'deny' },
        { pattern: 'rm -rf *', action: 'deny' },
        { pattern: 'rm -rf /*', action: 'deny' },
        { pattern: 'dangerous*', action: 'ask' },
      ],
    },
  };

  beforeEach(() => {
    manager = createPermissionManager(testConfig);
  });

  describe('check()', () => {
    test('allows "allow" default', async () => {
      const result = await manager.check('read', '/some/file.txt');

      expect(result).toBe(true);
    });

    test('denies "deny" default without prompt', async () => {
      const denyConfig: PermissionConfig = {
        ...testConfig,
        read: { default: 'deny' },
      };
      const denyManager = createPermissionManager(denyConfig);

      const result = await denyManager.check('read', '/some/file.txt');

      expect(result).toBe(false);
    });

    test('denies "ask" default without prompt function', async () => {
      const result = await manager.check('write', '/some/file.txt');

      expect(result).toBe(false);
    });

    test('calls promptFn for "ask" actions', async () => {
      const promptMock = mock(async () => true);
      manager.setPromptFn(promptMock);

      await manager.check('write', '/some/file.txt');

      expect(promptMock).toHaveBeenCalled();
    });

    test('returns promptFn result for "ask" actions', async () => {
      manager.setPromptFn(async () => true);
      const allowResult = await manager.check('write', '/some/file.txt');
      expect(allowResult).toBe(true);

      const newManager = createPermissionManager(testConfig);
      newManager.setPromptFn(async () => false);
      const denyResult = await newManager.check('write', '/some/file.txt');
      expect(denyResult).toBe(false);
    });
  });

  describe('evaluate()', () => {
    test('returns correct action for allow default', () => {
      const result = manager.evaluate('read', '/some/file.txt');

      expect(result.action).toBe('allow');
      expect(result.allowed).toBe(true);
    });

    test('returns correct action for ask default', () => {
      const result = manager.evaluate('write', '/some/file.txt');

      expect(result.action).toBe('ask');
      expect(result.allowed).toBe(false);
    });

    test('returns PermissionCheckResult format', () => {
      const result = manager.evaluate('read', '/some/file.txt');

      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('reason');
    });
  });

  describe('pattern matching', () => {
    test('matches wildcard patterns', async () => {
      const result = manager.evaluate('bash', 'git status');

      expect(result.action).toBe('allow');
    });

    test('git * matches git commands', () => {
      expect(manager.evaluate('bash', 'git push').action).toBe('allow');
      expect(manager.evaluate('bash', 'git pull').action).toBe('allow');
      expect(manager.evaluate('bash', 'git commit').action).toBe('allow');
    });

    test('npm test* matches test commands', () => {
      expect(manager.evaluate('bash', 'npm test').action).toBe('allow');
      expect(manager.evaluate('bash', 'npm test --watch').action).toBe('allow');
    });
  });

  describe('deny rules precedence', () => {
    test('deny rules are checked before allow', () => {
      const result = manager.evaluate('bash', 'sudo rm -rf /');

      expect(result.action).toBe('deny');
    });

    test('rm -rf is denied', () => {
      expect(manager.evaluate('bash', 'rm -rf /').action).toBe('deny');
      expect(manager.evaluate('bash', 'rm -rf ~').action).toBe('deny');
    });

    test('sudo is denied', () => {
      expect(manager.evaluate('bash', 'sudo apt-get install').action).toBe('deny');
    });
  });

  describe('bash rules', () => {
    test('allow patterns work for git commands', () => {
      expect(manager.evaluate('bash', 'git status').action).toBe('allow');
      expect(manager.evaluate('bash', 'git diff').action).toBe('allow');
    });

    test('deny patterns work for dangerous commands', () => {
      expect(manager.evaluate('bash', 'sudo su').action).toBe('deny');
      expect(manager.evaluate('bash', 'rm -rf /home').action).toBe('deny');
    });

    test('falls back to default for unmatched commands', () => {
      const result = manager.evaluate('bash', 'some-unknown-command');

      expect(result.action).toBe('ask');
    });
  });

  describe('session management', () => {
    test('allowForSession remembers allowed actions', async () => {
      manager.setPromptFn(async () => {
        throw new Error('Should not be called');
      });

      manager.allowForSession('write', '/file.txt');
      const result = await manager.check('write', '/file.txt');

      expect(result).toBe(true);
    });

    test('clearSession removes session allowances', async () => {
      manager.allowForSession('write', '/file.txt');
      manager.clearSession();
      manager.setPromptFn(async () => false);

      const result = await manager.check('write', '/file.txt');

      expect(result).toBe(false);
    });
  });

  describe('empty input', () => {
    test('applies default action for empty input', () => {
      const result = manager.evaluate('read');

      expect(result.action).toBe('allow');
    });

    test('applies default action for bash without input', () => {
      const result = manager.evaluate('bash');

      expect(result.action).toBe('ask');
    });
  });

  describe('configuration', () => {
    test('updateConfig changes behavior', () => {
      expect(manager.evaluate('read').action).toBe('allow');

      manager.updateConfig({ read: { default: 'deny' } });

      expect(manager.evaluate('read').action).toBe('deny');
    });

    test('getConfig returns current configuration', () => {
      const config = manager.getConfig();

      expect(config.read.default).toBe('allow');
      expect(config.bash.rules).toBeDefined();
    });
  });

  describe('createPermissionManager', () => {
    test('creates manager with custom config', () => {
      const customManager = createPermissionManager({
        read: { default: 'deny' },
        write: { default: 'allow' },
        edit: { default: 'allow' },
        glob: { default: 'allow' },
        grep: { default: 'allow' },
        bash: { default: 'allow' },
      });

      expect(customManager.evaluate('read').action).toBe('deny');
      expect(customManager.evaluate('write').action).toBe('allow');
    });
  });
});
