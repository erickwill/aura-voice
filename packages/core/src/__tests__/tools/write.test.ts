import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { readFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { writeTool } from '../../tools/write.js';

const TEST_DIR = join(process.cwd(), 'tmp-write-test');

describe('writeTool', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  test('writes content to new file', async () => {
    const testFile = join(TEST_DIR, 'new.txt');
    const content = 'Hello, World!';

    const result = await writeTool.execute({ path: testFile, content });

    expect(result.success).toBe(true);
    expect(result.output).toContain('Successfully wrote');
    expect(existsSync(testFile)).toBe(true);
    expect(readFileSync(testFile, 'utf-8')).toBe(content);
  });

  test('overwrites existing file', async () => {
    const testFile = join(TEST_DIR, 'existing.txt');
    const originalContent = 'Original content';
    const newContent = 'New content';

    // Create file with original content
    await writeTool.execute({ path: testFile, content: originalContent });

    // Overwrite with new content
    const result = await writeTool.execute({ path: testFile, content: newContent });

    expect(result.success).toBe(true);
    expect(readFileSync(testFile, 'utf-8')).toBe(newContent);
  });

  test('creates parent directories', async () => {
    const testFile = join(TEST_DIR, 'nested', 'deep', 'file.txt');
    const content = 'Nested content';

    const result = await writeTool.execute({ path: testFile, content });

    expect(result.success).toBe(true);
    expect(existsSync(testFile)).toBe(true);
    expect(readFileSync(testFile, 'utf-8')).toBe(content);
  });

  test('returns success result with line count', async () => {
    const testFile = join(TEST_DIR, 'lines.txt');
    const content = 'line 1\nline 2\nline 3';

    const result = await writeTool.execute({ path: testFile, content });

    expect(result.success).toBe(true);
    expect(result.output).toContain('3 lines');
  });

  test('handles empty content', async () => {
    const testFile = join(TEST_DIR, 'empty.txt');

    const result = await writeTool.execute({ path: testFile, content: '' });

    expect(result.success).toBe(true);
    expect(readFileSync(testFile, 'utf-8')).toBe('');
  });

  test('handles unicode content', async () => {
    const testFile = join(TEST_DIR, 'unicode.txt');
    const content = '你好世界\n🎉 emoji\nтекст';

    const result = await writeTool.execute({ path: testFile, content });

    expect(result.success).toBe(true);
    expect(readFileSync(testFile, 'utf-8')).toBe(content);
  });

  test('handles multiline content', async () => {
    const testFile = join(TEST_DIR, 'multiline.txt');
    const content = `function hello() {
  console.log("Hello");
  return true;
}`;

    const result = await writeTool.execute({ path: testFile, content });

    expect(result.success).toBe(true);
    expect(readFileSync(testFile, 'utf-8')).toBe(content);
  });
});
