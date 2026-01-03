import { spawn } from 'child_process';
import type { Tool, ToolResult } from '@10x/shared';

interface BashParams {
  command: string;
  timeout?: number;
}

const DEFAULT_TIMEOUT = 120000; // 2 minutes
const MAX_OUTPUT = 30000; // characters

export const bashTool: Tool = {
  name: 'bash',
  description:
    'Execute a bash command. Use for running scripts, git commands, package managers, etc.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The bash command to execute',
      },
      timeout: {
        type: 'number',
        description: `Timeout in milliseconds. Default: ${DEFAULT_TIMEOUT}ms (2 minutes)`,
      },
    },
    required: ['command'],
  },

  async execute(params: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult> {
    const { command, timeout = DEFAULT_TIMEOUT } = params as unknown as BashParams;

    // Check if already aborted
    if (signal?.aborted) {
      return {
        success: false,
        error: 'Command execution aborted',
      };
    }

    try {
      const result = await runBash(command, timeout, signal);

      // Combine stdout and stderr
      let output = '';
      if (result.stdout) {
        output += result.stdout;
      }
      if (result.stderr) {
        if (output) output += '\n';
        output += `[stderr]\n${result.stderr}`;
      }

      // Truncate if too long
      if (output.length > MAX_OUTPUT) {
        output = output.slice(0, MAX_OUTPUT) + '\n\n... (output truncated)';
      }

      // Check exit code
      if (result.exitCode !== 0) {
        return {
          success: false,
          output,
          error: `Command exited with code ${result.exitCode}`,
        };
      }

      return {
        success: true,
        output: output || '(no output)',
      };
    } catch (error) {
      // Handle abort error
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Command execution aborted',
        };
      }

      if (error instanceof Error && error.message === 'TIMEOUT') {
        return {
          success: false,
          error: `Command timed out after ${timeout}ms`,
        };
      }

      return {
        success: false,
        error: `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};

/**
 * Run a bash command
 */
function runBash(
  command: string,
  timeout: number,
  signal?: AbortSignal
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    // Check if already aborted
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const proc = spawn('bash', ['-c', command], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Disable interactive prompts
        GIT_TERMINAL_PROMPT: '0',
        npm_config_yes: 'true',
      },
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    // Set timeout
    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
      reject(new Error('TIMEOUT'));
    }, timeout);

    // Handle abort signal
    const abortHandler = () => {
      if (!killed) {
        killed = true;
        clearTimeout(timer);
        proc.kill('SIGTERM');
        reject(new DOMException('Aborted', 'AbortError'));
      }
    };
    signal?.addEventListener('abort', abortHandler, { once: true });

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abortHandler);
      if (!killed) {
        resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abortHandler);
      reject(err);
    });
  });
}
