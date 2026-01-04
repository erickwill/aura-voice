import { describe, expect, test, beforeEach, mock } from 'bun:test';
import { Router, type RouterConfig, type StreamEvent } from '../../router/router.js';
import { ToolRegistry } from '../../tools/registry.js';
import type { OpenRouterClient } from '../../providers/openrouter.js';
import type { AIProviderConfig } from '../../providers/ai-provider.js';

// Mock AI provider config for tests
const mockAIProviderConfig: AIProviderConfig = {
  apiKey: 'test-api-key',
  baseURL: 'https://openrouter.ai/api/v1',
};

// Mock OpenRouter client for non-streaming tests
function createMockClient(): OpenRouterClient {
  return {
    chat: mock(async () => ({
      choices: [
        {
          message: {
            content: 'Test response',
            tool_calls: [],
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    })),
    chatStream: mock(async function* () {
      yield {
        choices: [
          {
            delta: { content: 'Hello ' },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: { content: 'world' },
            finish_reason: 'stop',
          },
        ],
      };
    }),
    getModels: mock(async () => ({ data: [] })),
  } as unknown as OpenRouterClient;
}

describe('Router', () => {
  let router: Router;
  let mockClient: OpenRouterClient;

  beforeEach(() => {
    mockClient = createMockClient();
    router = new Router({
      client: mockClient,
      aiProviderConfig: mockAIProviderConfig,
      defaultTier: 'smart',
    });
  });

  describe('constructor', () => {
    test('sets default values', () => {
      const r = new Router({ client: mockClient, aiProviderConfig: mockAIProviderConfig });
      expect(r).toBeDefined();
    });

    test('accepts custom config', () => {
      const r = new Router({
        client: mockClient,
        aiProviderConfig: mockAIProviderConfig,
        defaultTier: 'fast',
        systemPrompt: 'Test prompt',
      });
      expect(r).toBeDefined();
    });
  });

  describe('classify()', () => {
    test('returns smart for complex patterns', async () => {
      expect(await router.classify('implement a new feature')).toBe('smart');
      expect(await router.classify('refactor the authentication module')).toBe('smart');
      expect(await router.classify('debug this issue')).toBe('smart');
      expect(await router.classify('analyze the code')).toBe('smart');
    });

    test('returns superfast for simple short queries', async () => {
      expect(await router.classify('what is X')).toBe('superfast');
      expect(await router.classify('how do I')).toBe('superfast');
      expect(await router.classify('explain this')).toBe('superfast');
    });

    test('returns fast for simple long queries', async () => {
      const longQuery =
        'what is the difference between these two approaches when considering ' +
        'performance and maintainability in a large scale application?';
      expect(await router.classify(longQuery)).toBe('fast');
    });

    test('falls back to defaultTier', async () => {
      const tier = await router.classify('do something');
      expect(tier).toBe('smart'); // Default tier
    });

    test('respects custom defaultTier', async () => {
      const customRouter = new Router({
        client: mockClient,
        aiProviderConfig: mockAIProviderConfig,
        defaultTier: 'fast',
      });

      const tier = await customRouter.classify('random input');
      expect(tier).toBe('fast');
    });
  });

  describe('complete()', () => {
    test('returns response content', async () => {
      const result = await router.complete([
        { role: 'user', content: 'Hello' },
      ]);

      expect(result.content).toBe('Test response');
    });

    test('returns selected tier', async () => {
      const result = await router.complete(
        [{ role: 'user', content: 'Hello' }],
        'fast'
      );

      expect(result.tier).toBe('fast');
    });

    test('returns usage data when available', async () => {
      const result = await router.complete([
        { role: 'user', content: 'Hello' },
      ]);

      expect(result.usage).toBeDefined();
      expect(result.usage!.promptTokens).toBe(10);
      expect(result.usage!.completionTokens).toBe(20);
      expect(result.usage!.totalTokens).toBe(30);
    });

    test('adds system prompt to messages', async () => {
      const systemRouter = new Router({
        client: mockClient,
        aiProviderConfig: mockAIProviderConfig,
        systemPrompt: 'You are a helpful assistant',
      });

      await systemRouter.complete([{ role: 'user', content: 'Hello' }]);

      expect(mockClient.chat).toHaveBeenCalled();
      const callArgs = (mockClient.chat as any).mock.calls[0][0];
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[0].content).toBe('You are a helpful assistant');
    });
  });

  describe('setSystemPrompt()', () => {
    test('updates prompt', async () => {
      router.setSystemPrompt('New system prompt');

      await router.complete([{ role: 'user', content: 'Hello' }]);

      const callArgs = (mockClient.chat as any).mock.calls[0][0];
      expect(callArgs.messages[0].content).toBe('New system prompt');
    });
  });

  describe('setDefaultTier()', () => {
    test('updates tier', async () => {
      router.setDefaultTier('fast');

      const tier = await router.classify('some input');
      expect(tier).toBe('fast');
    });
  });

  describe('tool support', () => {
    test('includes tools in request', async () => {
      const tools = new ToolRegistry();
      tools.register({
        name: 'test-tool',
        description: 'A test tool',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({ success: true, output: 'done' }),
      });

      const routerWithTools = new Router({
        client: mockClient,
        aiProviderConfig: mockAIProviderConfig,
        tools,
      });

      await routerWithTools.complete([{ role: 'user', content: 'Hello' }]);

      const callArgs = (mockClient.chat as any).mock.calls[0][0];
      expect(callArgs.tools).toBeDefined();
      expect(callArgs.tools.length).toBe(1);
    });
  });

  describe('stream()', () => {
    test('yields text events', async () => {
      const events: StreamEvent[] = [];

      for await (const event of router.stream([
        { role: 'user', content: 'Hello' },
      ])) {
        events.push(event);
      }

      const textEvents = events.filter((e) => e.type === 'text');
      expect(textEvents.length).toBeGreaterThan(0);
      expect(textEvents[0].content).toBe('Hello ');
    });

    test('yields done event', async () => {
      const events: StreamEvent[] = [];

      for await (const event of router.stream([
        { role: 'user', content: 'Hello' },
      ])) {
        events.push(event);
      }

      const doneEvents = events.filter((e) => e.type === 'done');
      expect(doneEvents.length).toBe(1);
    });

    test('includes tier in events', async () => {
      for await (const event of router.stream(
        [{ role: 'user', content: 'Hello' }],
        'fast'
      )) {
        expect(event.tier).toBe('fast');
      }
    });
  });
});
