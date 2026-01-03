import type { Tool, ToolResult, OpenRouterTool } from '@10x/shared';
import type { PermissionManager } from '../permissions/manager.js';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private permissionManager: PermissionManager | null = null;

  /**
   * Set the permission manager for access control
   */
  setPermissionManager(manager: PermissionManager): void {
    this.permissionManager = manager;
  }

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool names
   */
  names(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get the permission input for a tool call
   */
  private getPermissionInput(name: string, params: Record<string, unknown>): string {
    switch (name) {
      case 'read':
      case 'write':
      case 'edit':
      case 'glob':
        return (params.path as string) || '';
      case 'grep':
        return (params.pattern as string) || '';
      case 'bash':
        return (params.command as string) || '';
      default:
        return JSON.stringify(params);
    }
  }

  /**
   * Execute a tool by name
   */
  async execute(
    name: string,
    params: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<ToolResult> {
    // Check for abort before starting
    if (signal?.aborted) {
      return {
        success: false,
        error: 'Tool execution aborted',
      };
    }

    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
    }

    // Check permissions if manager is set
    if (this.permissionManager) {
      const input = this.getPermissionInput(name, params);
      const allowed = await this.permissionManager.check(name, input);

      if (!allowed) {
        return {
          success: false,
          error: `Permission denied for ${name}: ${input}`,
          output: 'Action was blocked by permission settings. You can ask the user to update their permissions if needed.',
        };
      }
    }

    try {
      // Pass signal to tool if it supports it
      return await tool.execute(params, signal);
    } catch (error) {
      // Handle abort errors gracefully
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Tool execution aborted',
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }

  /**
   * Convert tools to OpenRouter/OpenAI format
   */
  toOpenRouterTools(): OpenRouterTool[] {
    return Array.from(this.tools.values()).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Get tool count
   */
  get size(): number {
    return this.tools.size;
  }
}
