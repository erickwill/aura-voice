import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';
import type { ContentPart, ImagePart, TextPart } from '@10x/shared';

/**
 * Supported image formats
 */
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

/**
 * MIME types for images
 */
const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

/**
 * Check if a file is an image based on extension
 */
export function isImageFile(path: string): boolean {
  const ext = extname(path).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Convert an image file to a base64 data URL
 */
export function imageToDataUrl(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`Image file not found: ${path}`);
  }

  const ext = extname(path).toLowerCase();
  const mimeType = MIME_TYPES[ext];

  if (!mimeType) {
    throw new Error(`Unsupported image format: ${ext}`);
  }

  const buffer = readFileSync(path);
  const base64 = buffer.toString('base64');

  return `data:${mimeType};base64,${base64}`;
}

/**
 * Create an ImagePart from a file path
 */
export function createImagePart(path: string): ImagePart {
  const dataUrl = imageToDataUrl(path);
  return {
    type: 'image_url',
    image_url: {
      url: dataUrl,
    },
  };
}

/**
 * Create a TextPart
 */
export function createTextPart(text: string): TextPart {
  return {
    type: 'text',
    text,
  };
}

/**
 * Parse a message for @file references and convert to content parts
 * @param message The user message
 * @param workingDir The working directory for resolving relative paths
 */
export function parseMessageWithImages(
  message: string,
  workingDir: string = process.cwd()
): { content: string | ContentPart[]; hasImages: boolean } {
  // Pattern to match @file references
  const filePattern = /@([\w./\-_]+\.(png|jpg|jpeg|gif|webp|bmp))/gi;

  const matches = [...message.matchAll(filePattern)];

  if (matches.length === 0) {
    return { content: message, hasImages: false };
  }

  const parts: ContentPart[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    const [fullMatch, filePath] = match;
    const startIndex = match.index!;

    // Add text before this match
    if (startIndex > lastIndex) {
      const textBefore = message.slice(lastIndex, startIndex).trim();
      if (textBefore) {
        parts.push(createTextPart(textBefore));
      }
    }

    // Resolve the file path
    const resolvedPath = filePath.startsWith('/')
      ? filePath
      : `${workingDir}/${filePath}`;

    try {
      parts.push(createImagePart(resolvedPath));
    } catch (error) {
      // If image can't be loaded, keep it as text
      parts.push(createTextPart(fullMatch));
    }

    lastIndex = startIndex + fullMatch.length;
  }

  // Add any remaining text
  if (lastIndex < message.length) {
    const textAfter = message.slice(lastIndex).trim();
    if (textAfter) {
      parts.push(createTextPart(textAfter));
    }
  }

  return { content: parts, hasImages: true };
}

/**
 * Get the recommended model for image understanding
 */
export function getImageModel(): string {
  return 'google/gemini-2.0-flash-001'; // Good multimodal model
}

/**
 * Check if a model supports vision/images
 */
export function supportsVision(model: string): boolean {
  const visionModels = [
    'google/gemini',
    'anthropic/claude-3',
    'anthropic/claude-opus-4',
    'anthropic/claude-sonnet-4',
    'openai/gpt-4o',
    'openai/gpt-4-vision',
  ];

  return visionModels.some((prefix) => model.startsWith(prefix) || model.includes(prefix));
}
