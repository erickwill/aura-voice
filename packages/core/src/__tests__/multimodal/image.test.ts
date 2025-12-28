import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  isImageFile,
  imageToDataUrl,
  createImagePart,
  createTextPart,
  parseMessageWithImages,
  getImageModel,
  supportsVision,
} from '../../multimodal/image.js';

const TEST_DIR = join(process.cwd(), 'tmp-multimodal-test');

// Create a small 1x1 PNG image
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

describe('multimodal/image', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('isImageFile()', () => {
    test('detects PNG files', () => {
      expect(isImageFile('image.png')).toBe(true);
      expect(isImageFile('image.PNG')).toBe(true);
    });

    test('detects JPG files', () => {
      expect(isImageFile('image.jpg')).toBe(true);
      expect(isImageFile('image.jpeg')).toBe(true);
      expect(isImageFile('image.JPEG')).toBe(true);
    });

    test('detects GIF files', () => {
      expect(isImageFile('image.gif')).toBe(true);
    });

    test('detects WebP files', () => {
      expect(isImageFile('image.webp')).toBe(true);
    });

    test('detects BMP files', () => {
      expect(isImageFile('image.bmp')).toBe(true);
    });

    test('rejects non-image files', () => {
      expect(isImageFile('file.txt')).toBe(false);
      expect(isImageFile('file.js')).toBe(false);
      expect(isImageFile('file.ts')).toBe(false);
      expect(isImageFile('file.pdf')).toBe(false);
      expect(isImageFile('file.svg')).toBe(false);
    });

    test('handles paths with directories', () => {
      expect(isImageFile('/path/to/image.png')).toBe(true);
      expect(isImageFile('./images/photo.jpg')).toBe(true);
    });
  });

  describe('imageToDataUrl()', () => {
    test('creates data URL from PNG', () => {
      const imagePath = join(TEST_DIR, 'test.png');
      writeFileSync(imagePath, TINY_PNG);

      const dataUrl = imageToDataUrl(imagePath);

      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    test('creates data URL from JPG', () => {
      const imagePath = join(TEST_DIR, 'test.jpg');
      writeFileSync(imagePath, TINY_PNG); // Using PNG bytes for simplicity

      const dataUrl = imageToDataUrl(imagePath);

      expect(dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
    });

    test('throws for missing file', () => {
      expect(() => imageToDataUrl('/nonexistent/image.png')).toThrow('not found');
    });

    test('throws for unsupported format', () => {
      const textFile = join(TEST_DIR, 'test.xyz');
      writeFileSync(textFile, 'text');

      expect(() => imageToDataUrl(textFile)).toThrow('Unsupported image format');
    });
  });

  describe('createImagePart()', () => {
    test('returns correct format', () => {
      const imagePath = join(TEST_DIR, 'test.png');
      writeFileSync(imagePath, TINY_PNG);

      const part = createImagePart(imagePath);

      expect(part.type).toBe('image_url');
      expect(part.image_url).toBeDefined();
      expect(part.image_url.url).toContain('data:image/png;base64,');
    });
  });

  describe('createTextPart()', () => {
    test('returns correct format', () => {
      const part = createTextPart('Hello world');

      expect(part.type).toBe('text');
      expect(part.text).toBe('Hello world');
    });
  });

  describe('parseMessageWithImages()', () => {
    test('returns string for message without images', () => {
      const result = parseMessageWithImages('Hello world');

      expect(result.hasImages).toBe(false);
      expect(result.content).toBe('Hello world');
    });

    test('extracts image paths from @references', () => {
      const imagePath = join(TEST_DIR, 'test.png');
      writeFileSync(imagePath, TINY_PNG);

      const result = parseMessageWithImages(
        `Look at this @test.png please`,
        TEST_DIR
      );

      expect(result.hasImages).toBe(true);
      expect(Array.isArray(result.content)).toBe(true);
    });

    test('preserves text around images', () => {
      const imagePath = join(TEST_DIR, 'test.png');
      writeFileSync(imagePath, TINY_PNG);

      const result = parseMessageWithImages(
        `Before @test.png after`,
        TEST_DIR
      );

      expect(result.hasImages).toBe(true);
      const parts = result.content as any[];

      // Should have text parts and image part
      expect(parts.some((p: any) => p.type === 'text' && p.text === 'Before')).toBe(true);
      expect(parts.some((p: any) => p.type === 'image_url')).toBe(true);
      expect(parts.some((p: any) => p.type === 'text' && p.text === 'after')).toBe(true);
    });

    test('handles multiple image references', () => {
      const imagePath1 = join(TEST_DIR, 'img1.png');
      const imagePath2 = join(TEST_DIR, 'img2.jpg');
      writeFileSync(imagePath1, TINY_PNG);
      writeFileSync(imagePath2, TINY_PNG);

      const result = parseMessageWithImages(
        `@img1.png and @img2.jpg`,
        TEST_DIR
      );

      expect(result.hasImages).toBe(true);
      const parts = result.content as any[];
      const imageParts = parts.filter((p: any) => p.type === 'image_url');
      expect(imageParts.length).toBe(2);
    });

    test('keeps invalid image references as text', () => {
      const result = parseMessageWithImages(
        `Look at @nonexistent.png`,
        TEST_DIR
      );

      expect(result.hasImages).toBe(true);
      const parts = result.content as any[];
      // Invalid image should be kept as text
      expect(parts.some((p: any) => p.type === 'text' && p.text.includes('@nonexistent.png'))).toBe(true);
    });
  });

  describe('getImageModel()', () => {
    test('returns default vision model', () => {
      const model = getImageModel();

      expect(model).toBeDefined();
      expect(typeof model).toBe('string');
    });
  });

  describe('supportsVision()', () => {
    test('identifies Gemini models', () => {
      expect(supportsVision('google/gemini-2.0-flash-001')).toBe(true);
      expect(supportsVision('google/gemini-pro')).toBe(true);
    });

    test('identifies Claude 3 models', () => {
      expect(supportsVision('anthropic/claude-3-opus')).toBe(true);
      expect(supportsVision('anthropic/claude-3-sonnet')).toBe(true);
    });

    test('identifies Claude 4 models', () => {
      expect(supportsVision('anthropic/claude-opus-4')).toBe(true);
      expect(supportsVision('anthropic/claude-sonnet-4')).toBe(true);
    });

    test('identifies GPT-4 vision models', () => {
      expect(supportsVision('openai/gpt-4o')).toBe(true);
      expect(supportsVision('openai/gpt-4-vision-preview')).toBe(true);
    });

    test('rejects non-vision models', () => {
      expect(supportsVision('groq/llama-2-70b')).toBe(false);
      expect(supportsVision('openai/gpt-3.5-turbo')).toBe(false);
    });
  });
});
