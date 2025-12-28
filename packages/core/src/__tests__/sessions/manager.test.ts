import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { SessionManager } from '../../sessions/manager.js';
import type { Session } from '../../sessions/types.js';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  afterEach(() => {
    // Clean up any created sessions
    const current = manager.getCurrent();
    if (current) {
      manager.delete(current.id);
    }
  });

  describe('create()', () => {
    test('returns new session', () => {
      const session = manager.create();

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.messages).toEqual([]);
      expect(session.state).toBe('active');
    });

    test('sets correct model', () => {
      const session = manager.create({ model: 'fast' });

      expect(session.model).toBe('fast');
    });

    test('uses smart as default model', () => {
      const session = manager.create();

      expect(session.model).toBe('smart');
    });

    test('sets name when provided', () => {
      const session = manager.create({ name: 'test-session' });

      expect(session.name).toBe('test-session');
    });

    test('sets working directory', () => {
      const session = manager.create({ workingDirectory: '/tmp' });

      expect(session.workingDirectory).toBe('/tmp');
    });

    test('uses cwd as default working directory', () => {
      const session = manager.create();

      expect(session.workingDirectory).toBe(process.cwd());
    });

    test('creates unique IDs', () => {
      const session1 = manager.create();
      const id1 = session1.id;
      manager.delete(id1);

      const session2 = manager.create();
      expect(session2.id).not.toBe(id1);
      manager.delete(session2.id);
    });
  });

  describe('getOrCreate()', () => {
    test('creates session if none exists', () => {
      const session = manager.getOrCreate();

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
    });

    test('returns existing session', () => {
      const first = manager.create({ name: 'first' });
      const second = manager.getOrCreate();

      expect(second.id).toBe(first.id);
    });
  });

  describe('getCurrent()', () => {
    test('returns null initially', () => {
      expect(manager.getCurrent()).toBeNull();
    });

    test('returns current session after create', () => {
      const created = manager.create();

      expect(manager.getCurrent()).toBe(created);
    });
  });

  describe('load()', () => {
    test('retrieves session by ID', () => {
      const created = manager.create({ name: 'load-test' });
      const id = created.id;

      // Create a new manager to simulate fresh load
      const newManager = new SessionManager();
      const loaded = newManager.load(id);

      expect(loaded).toBeDefined();
      expect(loaded!.id).toBe(id);
      expect(loaded!.name).toBe('load-test');

      // Clean up
      newManager.delete(id);
    });

    test('returns null for non-existent ID', () => {
      const loaded = manager.load('non-existent-id');

      expect(loaded).toBeNull();
    });
  });

  describe('addMessage()', () => {
    test('adds message to session', () => {
      manager.create();
      manager.addMessage({ role: 'user', content: 'Hello' });

      const session = manager.getCurrent();
      expect(session!.messages.length).toBe(1);
      expect(session!.messages[0].content).toBe('Hello');
    });

    test('creates session if none exists', () => {
      manager.addMessage({ role: 'user', content: 'Hello' });

      expect(manager.getCurrent()).toBeDefined();
    });

    test('updates token usage for user messages', () => {
      manager.create();
      const before = manager.getCurrent()!.tokenUsage.input;

      manager.addMessage({ role: 'user', content: 'Hello world' });

      const after = manager.getCurrent()!.tokenUsage.input;
      expect(after).toBeGreaterThan(before);
    });

    test('updates token usage for assistant messages', () => {
      manager.create();
      const before = manager.getCurrent()!.tokenUsage.output;

      manager.addMessage({ role: 'assistant', content: 'Hi there!' });

      const after = manager.getCurrent()!.tokenUsage.output;
      expect(after).toBeGreaterThan(before);
    });
  });

  describe('rename()', () => {
    test('updates session name', () => {
      manager.create({ name: 'old-name' });

      const result = manager.rename('new-name');

      expect(result).toBe(true);
      expect(manager.getCurrent()!.name).toBe('new-name');
    });

    test('returns false when no current session', () => {
      const result = manager.rename('name');

      expect(result).toBe(false);
    });
  });

  describe('fork()', () => {
    test('creates copy with new ID', () => {
      const original = manager.create({ name: 'original' });
      manager.addMessage({ role: 'user', content: 'Hello' });

      const forked = manager.fork('forked');

      expect(forked).toBeDefined();
      expect(forked!.id).not.toBe(original.id);
      expect(forked!.messages.length).toBe(1);

      // Clean up
      manager.delete(forked!.id);
    });

    test('sets parentId', () => {
      const original = manager.create();
      const forked = manager.fork();

      expect(forked!.parentId).toBe(original.id);

      manager.delete(forked!.id);
    });

    test('returns null when no current session', () => {
      const forked = manager.fork();

      expect(forked).toBeNull();
    });
  });

  describe('clear()', () => {
    test('resets messages', () => {
      manager.create();
      manager.addMessage({ role: 'user', content: 'Hello' });
      manager.addMessage({ role: 'assistant', content: 'Hi' });

      manager.clear();

      expect(manager.getCurrent()!.messages).toEqual([]);
    });

    test('resets token usage', () => {
      manager.create();
      manager.addMessage({ role: 'user', content: 'Hello' });

      manager.clear();

      expect(manager.getCurrent()!.tokenUsage.input).toBe(0);
      expect(manager.getCurrent()!.tokenUsage.output).toBe(0);
    });
  });

  describe('needsCompaction()', () => {
    test('returns false when no session', () => {
      expect(manager.needsCompaction()).toBe(false);
    });

    test('returns false for small sessions', () => {
      manager.create();
      manager.addMessage({ role: 'user', content: 'Hello' });

      expect(manager.needsCompaction()).toBe(false);
    });

    test('detects when compaction is needed', () => {
      manager.create({ model: 'superfast' }); // 128k context

      // Simulate high token usage (manually set for testing)
      const session = manager.getCurrent()!;
      session.tokenUsage.input = 100000;
      session.tokenUsage.output = 50000; // > 80% of 128k

      expect(manager.needsCompaction()).toBe(true);
    });
  });

  describe('getTokenCount()', () => {
    test('returns 0 when no session', () => {
      expect(manager.getTokenCount()).toBe(0);
    });

    test('returns combined input and output tokens', () => {
      manager.create();
      manager.addMessage({ role: 'user', content: 'Hello' });
      manager.addMessage({ role: 'assistant', content: 'Hi there!' });

      const count = manager.getTokenCount();
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('getContextWindow()', () => {
    test('returns smart context window by default', () => {
      expect(manager.getContextWindow()).toBe(200000);
    });

    test('returns correct window for model', () => {
      manager.create({ model: 'superfast' });
      expect(manager.getContextWindow()).toBe(128000);

      manager.delete(manager.getCurrent()!.id);
      manager.create({ model: 'fast' });
      expect(manager.getContextWindow()).toBe(256000);
    });
  });

  describe('compact()', () => {
    test('summarizes old messages', async () => {
      manager.create();

      // Add enough messages to trigger compaction
      for (let i = 0; i < 10; i++) {
        manager.addMessage({ role: 'user', content: `Message ${i}` });
        manager.addMessage({ role: 'assistant', content: `Response ${i}` });
      }

      const summary = await manager.compact(async () => 'Test summary');

      expect(summary).toBe('Test summary');
      // Should keep last 4 messages + summary
      expect(manager.getCurrent()!.messages.length).toBe(5);
    });

    test('returns null for small sessions', async () => {
      manager.create();
      manager.addMessage({ role: 'user', content: 'Hello' });

      const summary = await manager.compact(async () => 'Summary');

      expect(summary).toBeNull();
    });

    test('returns null when no session', async () => {
      const summary = await manager.compact(async () => 'Summary');

      expect(summary).toBeNull();
    });

    test('sets state to compacted', async () => {
      manager.create();

      for (let i = 0; i < 6; i++) {
        manager.addMessage({ role: 'user', content: `Message ${i}` });
      }

      await manager.compact(async () => 'Summary');

      expect(manager.getCurrent()!.state).toBe('compacted');
    });
  });
});
