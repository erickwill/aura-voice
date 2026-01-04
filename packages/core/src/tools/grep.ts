import { spawn } from 'child_process';
import { resolve } from 'path';
import { rgPath } from '@vscode/ripgrep';
import type { Tool, ToolResult } from '@10x/shared';
import { GREP_DESCRIPTION } from '../prompts/tools/grep.js';

interface GrepParams {
  pattern: string;
  path?: string;
  glob?: string;
}

const MAX_RESULTS = 100;

export const grepTool: Tool = {
  name: 'grep',
  description: GREP_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Regex pattern to search for',
      },
      path: {
        type: 'string',
        description: 'Directory to search in. Default: current working directory',
      },
      glob: {
        type: 'string',
        description: 'Glob pattern to filter files (e.g., "*.ts", "*.{js,jsx}")',
      },
    },
    required: ['pattern'],
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const { pattern, path, glob: globPattern } = params as unknown as GrepParams;

    try {
      // Resolve base path
      const basePath = path ? resolve(process.cwd(), path) : process.cwd();

      // Build ripgrep args
      const args = [
        '--line-number',
        '--no-heading',
        '--color=never',
        '--max-count=5', // Max matches per file
        '-g', '!node_modules',
        '-g', '!.git',
        '-g', '!dist',
        '-g', '!build',
        '-g', '!*.min.js',
      ];

      if (globPattern) {
        args.push('-g', globPattern);
      }

      args.push(pattern, basePath);

      // Run ripgrep (using bundled binary)
      const result = await runCommand(rgPath, args);

      // Check for ripgrep not found
      if (result.stderr && result.stderr.includes('not found')) {
        return {
          success: false,
          error:
            'ripgrep (rg) is not installed. Please install it: brew install ripgrep',
        };
      }

      if (result.exitCode !== 0 && !result.stdout) {
        // rg returns exit code 1 for no matches, 2 for errors
        if (result.exitCode === 1) {
          return {
            success: true,
            output: `No matches found for pattern: ${pattern}`,
          };
        }
        return {
          success: false,
          error: `Grep failed: ${result.stderr}`,
        };
      }

      // Parse results
      const lines = result.stdout.split('\n').filter(Boolean);
      const limited = lines.slice(0, MAX_RESULTS);
      const truncated = lines.length > MAX_RESULTS;

      // Format output
      let output = `Found ${lines.length} match${lines.length === 1 ? '' : 'es'}:\n\n`;
      output += limited.join('\n');

      if (truncated) {
        output += `\n\n... and ${lines.length - MAX_RESULTS} more matches`;
      }

      return {
        success: true,
        output,
      };
    } catch (error) {
      // Fallback message if ripgrep not installed
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return {
          success: false,
          error:
            'ripgrep (rg) is not installed. Please install it: brew install ripgrep',
        };
      }

      return {
        success: false,
        error: `Grep failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};

/**
 * Run a command and return stdout/stderr
 */
function runCommand(
  cmd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });

    proc.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, exitCode: 1 });
    });
  });
}
