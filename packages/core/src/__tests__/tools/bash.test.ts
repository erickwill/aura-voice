import { describe, expect, test } from 'bun:test';
import { bashTool } from '../../tools/bash.js';

describe('bashTool', () => {
  test('executes command successfully', async () => {
    const result = await bashTool.execute({ command: 'echo "hello"' });

    expect(result.success).toBe(true);
    expect(result.output).toContain('hello');
  });

  test('returns exit code 0 for successful command', async () => {
    const result = await bashTool.execute({ command: 'true' });

    expect(result.success).toBe(true);
  });

  test('captures stderr', async () => {
    const result = await bashTool.execute({ command: 'echo "error" >&2' });

    // Command succeeds even with stderr output
    expect(result.success).toBe(true);
    expect(result.output).toContain('[stderr]');
    expect(result.output).toContain('error');
  });

  test('returns exit code for failed command', async () => {
    const result = await bashTool.execute({ command: 'exit 1' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('exit');
    expect(result.error).toContain('1');
  });

  test('handles command not found', async () => {
    const result = await bashTool.execute({
      command: 'nonexistent_command_xyz_12345',
    });

    expect(result.success).toBe(false);
    expect(result.output).toContain('not found');
  });

  test('respects timeout', async () => {
    const result = await bashTool.execute({
      command: 'sleep 10',
      timeout: 100,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });

  test('handles multiline output', async () => {
    const result = await bashTool.execute({
      command: 'echo "line1"; echo "line2"; echo "line3"',
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('line1');
    expect(result.output).toContain('line2');
    expect(result.output).toContain('line3');
  });

  test('handles environment variables', async () => {
    const result = await bashTool.execute({ command: 'echo $HOME' });

    expect(result.success).toBe(true);
    expect(result.output!.trim().length).toBeGreaterThan(0);
  });

  test('handles pipes', async () => {
    const result = await bashTool.execute({
      command: 'echo "hello world" | wc -w',
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('2');
  });

  test('handles command with special characters', async () => {
    const result = await bashTool.execute({
      command: 'echo "hello & world"',
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('hello & world');
  });

  test('returns no output message for empty output', async () => {
    const result = await bashTool.execute({ command: 'true' });

    expect(result.success).toBe(true);
    expect(result.output).toBe('(no output)');
  });

  test('truncates very long output', async () => {
    const result = await bashTool.execute({
      command: 'yes "x" | head -n 10000',
    });

    expect(result.success).toBe(true);
    expect(result.output!.length).toBeLessThanOrEqual(30100); // MAX_OUTPUT + some buffer
  });

  test('handles current working directory', async () => {
    const result = await bashTool.execute({ command: 'pwd' });

    expect(result.success).toBe(true);
    expect(result.output).toContain(process.cwd());
  });
});
