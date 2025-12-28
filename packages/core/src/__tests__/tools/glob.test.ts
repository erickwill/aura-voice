import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { globTool } from '../../tools/glob.js';

const TEST_DIR = join(process.cwd(), 'tmp-glob-test');

describe('globTool', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    // Create test files
    writeFileSync(join(TEST_DIR, 'file1.ts'), 'ts1');
    writeFileSync(join(TEST_DIR, 'file2.ts'), 'ts2');
    writeFileSync(join(TEST_DIR, 'file1.js'), 'js1');
    mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'src', 'index.ts'), 'index');
    writeFileSync(join(TEST_DIR, 'src', 'utils.ts'), 'utils');
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  test('finds files matching pattern', async () => {
    const result = await globTool.execute({ pattern: '*.ts', path: TEST_DIR });

    expect(result.success).toBe(true);
    expect(result.output).toContain('file1.ts');
    expect(result.output).toContain('file2.ts');
    expect(result.output).not.toContain('file1.js');
  });

  test('respects path parameter', async () => {
    const result = await globTool.execute({
      pattern: '*.ts',
      path: join(TEST_DIR, 'src'),
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('index.ts');
    expect(result.output).toContain('utils.ts');
    expect(result.output).not.toContain('file1.ts');
  });

  test('finds files with recursive pattern', async () => {
    const result = await globTool.execute({ pattern: '**/*.ts', path: TEST_DIR });

    expect(result.success).toBe(true);
    expect(result.output).toContain('file1.ts');
    expect(result.output).toContain('index.ts');
  });

  test('ignores node_modules by default', async () => {
    mkdirSync(join(TEST_DIR, 'node_modules'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'node_modules', 'package.ts'), 'pkg');

    const result = await globTool.execute({ pattern: '**/*.ts', path: TEST_DIR });

    expect(result.success).toBe(true);
    expect(result.output).not.toContain('package.ts');
  });

  test('ignores .git by default', async () => {
    mkdirSync(join(TEST_DIR, '.git'), { recursive: true });
    writeFileSync(join(TEST_DIR, '.git', 'config.ts'), 'git');

    const result = await globTool.execute({ pattern: '**/*.ts', path: TEST_DIR });

    expect(result.success).toBe(true);
    expect(result.output).not.toContain('config.ts');
  });

  test('returns message for no matches', async () => {
    const result = await globTool.execute({ pattern: '*.xyz', path: TEST_DIR });

    expect(result.success).toBe(true);
    expect(result.output).toContain('No files found');
  });

  test('returns count of found files', async () => {
    const result = await globTool.execute({ pattern: '*.ts', path: TEST_DIR });

    expect(result.success).toBe(true);
    expect(result.output).toContain('Found 2 files');
  });

  test('handles complex patterns', async () => {
    const result = await globTool.execute({
      pattern: '**/*.{ts,js}',
      path: TEST_DIR,
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('file1.ts');
    expect(result.output).toContain('file1.js');
  });
});
