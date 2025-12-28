import { describe, expect, test, beforeEach, mock } from 'bun:test';
import { ToolRegistry } from '../../tools/registry.js';
import type { Tool, ToolResult } from '@10x/shared';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  const mockTool: Tool = {
    name: 'test-tool',
    description: 'A test tool',
    parameters: {
      type: 'object',
      properties: {
        input: { type: 'string' },
      },
      required: ['input'],
    },
    execute: async (params): Promise<ToolResult> => ({
      success: true,
      output: `Received: ${(params as { input: string }).input}`,
    }),
  };

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  test('registers tools correctly', () => {
    registry.register(mockTool);

    expect(registry.has('test-tool')).toBe(true);
    expect(registry.get('test-tool')).toBe(mockTool);
  });

  test('get returns undefined for unknown tool', () => {
    expect(registry.get('unknown')).toBeUndefined();
  });

  test('has returns false for unknown tool', () => {
    expect(registry.has('unknown')).toBe(false);
  });

  test('names returns all registered tool names', () => {
    const tool2: Tool = { ...mockTool, name: 'tool-2' };
    const tool3: Tool = { ...mockTool, name: 'tool-3' };

    registry.register(mockTool);
    registry.register(tool2);
    registry.register(tool3);

    const names = registry.names();
    expect(names).toContain('test-tool');
    expect(names).toContain('tool-2');
    expect(names).toContain('tool-3');
    expect(names.length).toBe(3);
  });

  test('execute runs correct tool', async () => {
    registry.register(mockTool);

    const result = await registry.execute('test-tool', { input: 'hello' });

    expect(result.success).toBe(true);
    expect(result.output).toBe('Received: hello');
  });

  test('execute returns ToolResult format', async () => {
    registry.register(mockTool);

    const result = await registry.execute('test-tool', { input: 'test' });

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
  });

  test('returns error for unknown tool', async () => {
    const result = await registry.execute('unknown-tool', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown tool');
  });

  test('toOpenRouterTools formats correctly', () => {
    registry.register(mockTool);

    const tools = registry.toOpenRouterTools();

    expect(tools.length).toBe(1);
    expect(tools[0]).toEqual({
      type: 'function',
      function: {
        name: 'test-tool',
        description: 'A test tool',
        parameters: mockTool.parameters,
      },
    });
  });

  test('size returns correct count', () => {
    expect(registry.size).toBe(0);

    registry.register(mockTool);
    expect(registry.size).toBe(1);

    registry.register({ ...mockTool, name: 'tool-2' });
    expect(registry.size).toBe(2);
  });

  test('handles tool execution errors gracefully', async () => {
    const errorTool: Tool = {
      ...mockTool,
      name: 'error-tool',
      execute: async () => {
        throw new Error('Tool failed');
      },
    };

    registry.register(errorTool);
    const result = await registry.execute('error-tool', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tool failed');
  });

  test('setPermissionManager enables permission checks', async () => {
    const mockPermissionManager = {
      check: mock(async () => false),
    };

    registry.register(mockTool);
    registry.setPermissionManager(mockPermissionManager as any);

    const result = await registry.execute('test-tool', { input: 'test' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });

  test('allows execution when permission granted', async () => {
    const mockPermissionManager = {
      check: mock(async () => true),
    };

    registry.register(mockTool);
    registry.setPermissionManager(mockPermissionManager as any);

    const result = await registry.execute('test-tool', { input: 'test' });

    expect(result.success).toBe(true);
  });

  test('getPermissionInput extracts path for file tools', async () => {
    const mockPermissionManager = {
      check: mock(async (_tool: string, input: string) => {
        // Verify the input is the path, not stringified params
        return input === '/some/path';
      }),
    };

    const readTool: Tool = {
      name: 'read',
      description: 'Read files',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => ({ success: true, output: 'content' }),
    };

    registry.register(readTool);
    registry.setPermissionManager(mockPermissionManager as any);

    const result = await registry.execute('read', { path: '/some/path' });

    expect(result.success).toBe(true);
  });

  test('getPermissionInput extracts command for bash', async () => {
    const mockPermissionManager = {
      check: mock(async (_tool: string, input: string) => {
        return input === 'git status';
      }),
    };

    const bashTool: Tool = {
      name: 'bash',
      description: 'Run bash commands',
      parameters: { type: 'object', properties: {}, required: [] },
      execute: async () => ({ success: true, output: 'output' }),
    };

    registry.register(bashTool);
    registry.setPermissionManager(mockPermissionManager as any);

    const result = await registry.execute('bash', { command: 'git status' });

    expect(result.success).toBe(true);
  });
});
