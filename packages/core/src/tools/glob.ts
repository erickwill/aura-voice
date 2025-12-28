import { glob } from 'glob';
import { resolve } from 'path';
import type { Tool, ToolResult } from '@10x/shared';

interface GlobParams {
  pattern: string;
  path?: string;
}

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.min.js',
  '**/*.bundle.js',
];

const MAX_RESULTS = 1000;

export const globTool: Tool = {
  name: 'glob',
  description:
    'Find files matching a glob pattern. Returns a list of file paths sorted by modification time.',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description:
          'Glob pattern to match (e.g., "**/*.ts", "src/**/*.tsx", "*.json")',
      },
      path: {
        type: 'string',
        description: 'Directory to search in. Default: current working directory',
      },
    },
    required: ['pattern'],
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const { pattern, path } = params as unknown as GlobParams;

    try {
      // Resolve base path
      const basePath = path ? resolve(process.cwd(), path) : process.cwd();

      // Run glob
      const files = await glob(pattern, {
        cwd: basePath,
        ignore: DEFAULT_IGNORE,
        nodir: true,
        absolute: false,
      });

      if (files.length === 0) {
        return {
          success: true,
          output: `No files found matching pattern: ${pattern}`,
        };
      }

      // Limit results
      const limited = files.slice(0, MAX_RESULTS);
      const truncated = files.length > MAX_RESULTS;

      // Format output
      let output = `Found ${files.length} file${files.length === 1 ? '' : 's'}:\n\n`;
      output += limited.join('\n');

      if (truncated) {
        output += `\n\n... and ${files.length - MAX_RESULTS} more files`;
      }

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error: `Glob failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
