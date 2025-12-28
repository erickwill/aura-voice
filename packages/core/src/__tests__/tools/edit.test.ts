import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { editTool } from '../../tools/edit.js';

const TEST_DIR = join(process.cwd(), 'tmp-edit-test');

describe('editTool', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  test('replaces unique string', async () => {
    const testFile = join(TEST_DIR, 'replace.txt');
    writeFileSync(testFile, 'Hello, World!');

    const result = await editTool.execute({
      path: testFile,
      old_string: 'World',
      new_string: 'Universe',
    });

    expect(result.success).toBe(true);
    expect(readFileSync(testFile, 'utf-8')).toBe('Hello, Universe!');
  });

  test('returns error if string not found', async () => {
    const testFile = join(TEST_DIR, 'notfound.txt');
    writeFileSync(testFile, 'Hello, World!');

    const result = await editTool.execute({
      path: testFile,
      old_string: 'nonexistent',
      new_string: 'replacement',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('returns error if multiple matches', async () => {
    const testFile = join(TEST_DIR, 'multiple.txt');
    writeFileSync(testFile, 'foo bar foo baz foo');

    const result = await editTool.execute({
      path: testFile,
      old_string: 'foo',
      new_string: 'qux',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('3 times');
    expect(result.error).toContain('must be unique');
  });

  test('returns error for non-existent file', async () => {
    const result = await editTool.execute({
      path: '/nonexistent/file.txt',
      old_string: 'old',
      new_string: 'new',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('File not found');
  });

  test('handles multiline replacements', async () => {
    const testFile = join(TEST_DIR, 'multiline.txt');
    const originalContent = `function hello() {
  console.log("Hello");
}`;
    writeFileSync(testFile, originalContent);

    const result = await editTool.execute({
      path: testFile,
      old_string: 'console.log("Hello");',
      new_string: 'console.log("Hello");\n  console.log("World");',
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('+1 lines');
    expect(readFileSync(testFile, 'utf-8')).toContain('World');
  });

  test('handles removing lines', async () => {
    const testFile = join(TEST_DIR, 'remove.txt');
    const originalContent = 'line 1\nline 2\nline 3';
    writeFileSync(testFile, originalContent);

    const result = await editTool.execute({
      path: testFile,
      old_string: '\nline 2',
      new_string: '',
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('-1 lines');
    expect(readFileSync(testFile, 'utf-8')).toBe('line 1\nline 3');
  });

  test('preserves file content outside of replacement', async () => {
    const testFile = join(TEST_DIR, 'preserve.txt');
    const originalContent = 'start\nmiddle\nend';
    writeFileSync(testFile, originalContent);

    const result = await editTool.execute({
      path: testFile,
      old_string: 'middle',
      new_string: 'CENTER',
    });

    expect(result.success).toBe(true);
    expect(readFileSync(testFile, 'utf-8')).toBe('start\nCENTER\nend');
  });

  test('handles whitespace-sensitive replacements', async () => {
    const testFile = join(TEST_DIR, 'whitespace.txt');
    writeFileSync(testFile, '  indented\n    more indented');

    const result = await editTool.execute({
      path: testFile,
      old_string: '  indented',
      new_string: '    double indented',
    });

    expect(result.success).toBe(true);
    expect(readFileSync(testFile, 'utf-8')).toBe('    double indented\n    more indented');
  });

  test('handles unicode in replacements', async () => {
    const testFile = join(TEST_DIR, 'unicode.txt');
    writeFileSync(testFile, 'Hello 世界');

    const result = await editTool.execute({
      path: testFile,
      old_string: '世界',
      new_string: '🌍 Earth',
    });

    expect(result.success).toBe(true);
    expect(readFileSync(testFile, 'utf-8')).toBe('Hello 🌍 Earth');
  });

  test('reports ±0 lines for same-size replacement', async () => {
    const testFile = join(TEST_DIR, 'same.txt');
    writeFileSync(testFile, 'abcd');

    const result = await editTool.execute({
      path: testFile,
      old_string: 'abcd',
      new_string: 'wxyz',
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('±0 lines');
  });
});
