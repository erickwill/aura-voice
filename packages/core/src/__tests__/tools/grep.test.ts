import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { grepTool } from '../../tools/grep.js';

const TEST_DIR = join(process.cwd(), 'tmp-grep-test');

describe('grepTool', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    // Create test files
    writeFileSync(
      join(TEST_DIR, 'file1.ts'),
      'function hello() {\n  console.log("hello");\n}\n'
    );
    writeFileSync(
      join(TEST_DIR, 'file2.ts'),
      'function world() {\n  console.log("world");\n}\n'
    );
    writeFileSync(
      join(TEST_DIR, 'file3.js'),
      'const message = "hello world";\n'
    );
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  test('finds pattern matches', async () => {
    const result = await grepTool.execute({ pattern: 'hello', path: TEST_DIR });

    expect(result.success).toBe(true);
    expect(result.output).toContain('file1.ts');
    expect(result.output).toContain('file3.js');
  });

  test('respects path parameter', async () => {
    mkdirSync(join(TEST_DIR, 'subdir'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'subdir', 'sub.ts'), 'hello');

    const result = await grepTool.execute({
      pattern: 'hello',
      path: join(TEST_DIR, 'subdir'),
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('sub.ts');
    expect(result.output).not.toContain('file1.ts');
  });

  test('respects glob filter', async () => {
    const result = await grepTool.execute({
      pattern: 'hello',
      path: TEST_DIR,
      glob: '*.ts',
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('file1.ts');
    expect(result.output).not.toContain('file3.js');
  });

  test('returns message for no matches', async () => {
    const result = await grepTool.execute({
      pattern: 'nonexistent_pattern_xyz',
      path: TEST_DIR,
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('No matches found');
  });

  test('handles regex patterns', async () => {
    const result = await grepTool.execute({
      pattern: 'console\\.log',
      path: TEST_DIR,
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('file1.ts');
    expect(result.output).toContain('file2.ts');
  });

  test('includes line numbers in output', async () => {
    const result = await grepTool.execute({ pattern: 'console', path: TEST_DIR });

    expect(result.success).toBe(true);
    // ripgrep format: file:line:content
    expect(result.output).toMatch(/:\d+:/);
  });

  test('ignores node_modules', async () => {
    mkdirSync(join(TEST_DIR, 'node_modules'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'node_modules', 'pkg.ts'), 'hello');

    const result = await grepTool.execute({ pattern: 'hello', path: TEST_DIR });

    expect(result.success).toBe(true);
    expect(result.output).not.toContain('node_modules');
  });

  test('ignores .git directory', async () => {
    mkdirSync(join(TEST_DIR, '.git'), { recursive: true });
    writeFileSync(join(TEST_DIR, '.git', 'config'), 'hello');

    const result = await grepTool.execute({ pattern: 'hello', path: TEST_DIR });

    expect(result.success).toBe(true);
    expect(result.output).not.toContain('.git');
  });

  test('returns count of matches', async () => {
    const result = await grepTool.execute({ pattern: 'hello', path: TEST_DIR });

    expect(result.success).toBe(true);
    expect(result.output).toMatch(/Found \d+ match/);
  });
});
