import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import type { Tool, ToolResult } from '@10x/shared';
import { WRITE_DESCRIPTION } from '../prompts/tools/write.js';

interface WriteParams {
  path: string;
  content: string;
}

export const writeTool: Tool = {
  name: 'write',
  description: WRITE_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to write to (absolute or relative to cwd)',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file',
      },
    },
    required: ['path', 'content'],
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const { path, content } = params as unknown as WriteParams;

    try {
      // Resolve path
      const absolutePath = resolve(process.cwd(), path);

      // Create parent directories if needed
      const dir = dirname(absolutePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Write file
      writeFileSync(absolutePath, content, 'utf-8');

      // Count lines
      const lineCount = content.split('\n').length;

      return {
        success: true,
        output: `Successfully wrote ${lineCount} lines to ${path}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
