import { readFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';
import type { Tool, ToolResult } from '@10x/shared';
import { READ_DESCRIPTION } from '../prompts/tools/read.js';

const MAX_LINES = 2000;
const MAX_LINE_LENGTH = 2000;

interface ReadParams {
  path: string;
  offset?: number;
  limit?: number;
}

export const readTool: Tool = {
  name: 'read',
  description: READ_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to read (absolute or relative to cwd)',
      },
      offset: {
        type: 'number',
        description: 'Line number to start reading from (1-based). Default: 1',
      },
      limit: {
        type: 'number',
        description: `Maximum number of lines to read. Default: ${MAX_LINES}`,
      },
    },
    required: ['path'],
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const { path, offset = 1, limit = MAX_LINES } = params as unknown as ReadParams;

    try {
      // Resolve path
      const absolutePath = resolve(process.cwd(), path);

      // Check if file exists
      if (!existsSync(absolutePath)) {
        return {
          success: false,
          error: `File not found: ${path}`,
        };
      }

      // Check if it's a file
      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        return {
          success: false,
          error: `Path is a directory, not a file: ${path}`,
        };
      }

      // Check file size (skip very large files)
      if (stats.size > 10 * 1024 * 1024) {
        return {
          success: false,
          error: `File too large (${(stats.size / 1024 / 1024).toFixed(1)}MB). Maximum: 10MB`,
        };
      }

      // Read file
      const content = readFileSync(absolutePath, 'utf-8');
      const lines = content.split('\n');

      // Apply offset and limit
      const startLine = Math.max(1, offset);
      const endLine = Math.min(lines.length, startLine + limit - 1);
      const selectedLines = lines.slice(startLine - 1, endLine);

      // Format with line numbers
      const formatted = selectedLines
        .map((line, index) => {
          const lineNum = startLine + index;
          const truncatedLine =
            line.length > MAX_LINE_LENGTH
              ? line.slice(0, MAX_LINE_LENGTH) + '...'
              : line;
          return `${String(lineNum).padStart(6, ' ')}\t${truncatedLine}`;
        })
        .join('\n');

      // Build output message
      let output = formatted;
      if (endLine < lines.length) {
        output += `\n\n... (${lines.length - endLine} more lines)`;
      }

      return {
        success: true,
        output: `File: ${path} (${lines.length} lines)\n\n${output}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
