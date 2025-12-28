import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { readTool } from '../../tools/read.js';

const TEST_DIR = join(process.cwd(), 'tmp-read-test');

describe('readTool', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  test('reads file content successfully', async () => {
    const testFile = join(TEST_DIR, 'test.txt');
    writeFileSync(testFile, 'line 1\nline 2\nline 3');

    const result = await readTool.execute({ path: testFile });

    expect(result.success).toBe(true);
    expect(result.output).toContain('3 lines');
    expect(result.output).toContain('line 1');
    expect(result.output).toContain('line 2');
    expect(result.output).toContain('line 3');
  });

  test('returns content with line numbers', async () => {
    const testFile = join(TEST_DIR, 'numbered.txt');
    writeFileSync(testFile, 'first\nsecond\nthird');

    const result = await readTool.execute({ path: testFile });

    expect(result.success).toBe(true);
    expect(result.output).toContain('1\t');
    expect(result.output).toContain('2\t');
    expect(result.output).toContain('3\t');
  });

  test('returns error for non-existent file', async () => {
    const result = await readTool.execute({ path: '/nonexistent/file.txt' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('File not found');
  });

  test('returns error for directory', async () => {
    const result = await readTool.execute({ path: TEST_DIR });

    expect(result.success).toBe(false);
    expect(result.error).toContain('directory');
  });

  test('respects offset parameter', async () => {
    const testFile = join(TEST_DIR, 'offset.txt');
    writeFileSync(testFile, 'line 1\nline 2\nline 3\nline 4\nline 5');

    const result = await readTool.execute({ path: testFile, offset: 3 });

    expect(result.success).toBe(true);
    expect(result.output).toContain('line 3');
    expect(result.output).toContain('line 4');
    expect(result.output).toContain('line 5');
    expect(result.output).not.toContain('line 1');
    expect(result.output).not.toContain('line 2');
  });

  test('respects limit parameter', async () => {
    const testFile = join(TEST_DIR, 'limit.txt');
    writeFileSync(testFile, 'line 1\nline 2\nline 3\nline 4\nline 5');

    const result = await readTool.execute({ path: testFile, limit: 2 });

    expect(result.success).toBe(true);
    expect(result.output).toContain('line 1');
    expect(result.output).toContain('line 2');
    expect(result.output).toContain('more lines');
  });

  test('truncates very long lines', async () => {
    const testFile = join(TEST_DIR, 'long.txt');
    const longLine = 'a'.repeat(3000);
    writeFileSync(testFile, longLine);

    const result = await readTool.execute({ path: testFile });

    expect(result.success).toBe(true);
    expect(result.output).toContain('...');
    expect(result.output!.length).toBeLessThan(3000);
  });

  test('handles empty file', async () => {
    const testFile = join(TEST_DIR, 'empty.txt');
    writeFileSync(testFile, '');

    const result = await readTool.execute({ path: testFile });

    expect(result.success).toBe(true);
    expect(result.output).toContain('1 lines');
  });

  test('handles file with unicode characters', async () => {
    const testFile = join(TEST_DIR, 'unicode.txt');
    writeFileSync(testFile, '你好世界\n🎉 emoji test\nнекоторый текст');

    const result = await readTool.execute({ path: testFile });

    expect(result.success).toBe(true);
    expect(result.output).toContain('你好世界');
    expect(result.output).toContain('🎉');
    expect(result.output).toContain('текст');
  });
});
