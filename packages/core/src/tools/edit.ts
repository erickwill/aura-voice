import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { Tool, ToolResult } from '@10x/shared';
import { EDIT_DESCRIPTION } from '../prompts/tools/edit.js';

interface EditParams {
  path: string;
  old_string: string;
  new_string: string;
}

export const editTool: Tool = {
  name: 'edit',
  description: EDIT_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to edit',
      },
      old_string: {
        type: 'string',
        description: 'The exact string to find and replace (must be unique in the file)',
      },
      new_string: {
        type: 'string',
        description: 'The string to replace it with',
      },
    },
    required: ['path', 'old_string', 'new_string'],
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const { path, old_string, new_string } = params as unknown as EditParams;

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

      // Read file
      const content = readFileSync(absolutePath, 'utf-8');

      // Count occurrences
      const occurrences = content.split(old_string).length - 1;

      if (occurrences === 0) {
        return {
          success: false,
          error: `String not found in file. Make sure the old_string matches exactly, including whitespace and indentation.`,
        };
      }

      if (occurrences > 1) {
        return {
          success: false,
          error: `String appears ${occurrences} times in the file. It must be unique. Include more surrounding context to make it unique.`,
        };
      }

      // Replace
      const newContent = content.replace(old_string, new_string);

      // Write back
      writeFileSync(absolutePath, newContent, 'utf-8');

      // Calculate diff stats
      const oldLines = old_string.split('\n').length;
      const newLines = new_string.split('\n').length;
      const diffLines = newLines - oldLines;
      const diffStr =
        diffLines > 0 ? `+${diffLines}` : diffLines < 0 ? `${diffLines}` : '±0';

      return {
        success: true,
        output: `Successfully edited ${path} (${diffStr} lines)`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to edit file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
