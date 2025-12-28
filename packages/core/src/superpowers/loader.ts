import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';
import { homedir } from 'os';
import matter from 'gray-matter';
import type { ModelTier } from '@10x/shared';
import type {
  Superpower,
  SuperpowerStep,
  SuperpowerFrontmatter,
  SuperpowersResult,
  SuperpowerLoadError,
} from './types.js';

// Cache for loaded superpowers
let superpowersCache: SuperpowersResult | null = null;
let cacheDir: string | null = null;

/**
 * Get the global superpowers path
 */
export function getGlobalSuperpowersPath(): string {
  return join(homedir(), '.config', '10x', 'superpowers');
}

/**
 * Get the project superpowers path
 */
export function getProjectSuperpowersPath(cwd: string = process.cwd()): string {
  return join(cwd, '.10x', 'superpowers');
}

/**
 * Get the built-in superpowers path (bundled with the package)
 */
export function getBuiltinSuperpowersPath(): string {
  // Look for bundled superpowers relative to this file
  const possiblePaths = [
    join(dirname(import.meta.url.replace('file://', '')), '..', '..', 'superpowers'),
    join(process.cwd(), 'superpowers'),
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  return possiblePaths[0];
}

/**
 * Parse a step block from markdown content
 */
function parseStep(stepContent: string, stepNumber: number): SuperpowerStep | null {
  // Parse step header: ## Step N: Name (model: tier)
  const headerMatch = stepContent.match(/^##\s*Step\s*\d+:\s*(.+?)(?:\s*\(model:\s*(\w+)\))?\s*$/m);

  if (!headerMatch) {
    return null;
  }

  const name = headerMatch[1].trim();
  const modelStr = headerMatch[2]?.toLowerCase() || 'smart';
  const model: ModelTier = ['superfast', 'fast', 'smart'].includes(modelStr)
    ? (modelStr as ModelTier)
    : 'smart';

  // Extract the prompt (everything after the header)
  const promptStart = stepContent.indexOf('\n', stepContent.indexOf(headerMatch[0]));
  const prompt = promptStart >= 0 ? stepContent.slice(promptStart).trim() : '';

  // Check for special markers
  const usesPreviousOutput = prompt.includes('{{previous}}') || prompt.includes('{{output}}');
  const multimodal = prompt.includes('{{image}}') || prompt.includes('{{images}}');

  // Check for tool restrictions
  const toolsMatch = prompt.match(/<!--\s*tools:\s*(.+?)\s*-->/);
  const tools = toolsMatch ? toolsMatch[1].split(',').map(t => t.trim()) : undefined;

  return {
    number: stepNumber,
    name,
    model,
    prompt,
    usesPreviousOutput,
    multimodal,
    tools,
  };
}

/**
 * Parse steps from markdown content
 */
function parseSteps(content: string): SuperpowerStep[] {
  const steps: SuperpowerStep[] = [];

  // Split by step headers
  const stepPattern = /(?=##\s*Step\s*\d+:)/g;
  const parts = content.split(stepPattern).filter(p => p.trim());

  let stepNumber = 1;
  for (const part of parts) {
    if (part.match(/^##\s*Step\s*\d+:/)) {
      const step = parseStep(part, stepNumber);
      if (step) {
        steps.push(step);
        stepNumber++;
      }
    }
  }

  return steps;
}

/**
 * Load a single superpower from a file
 */
function loadSuperpowerFile(filePath: string, builtin: boolean): Superpower | SuperpowerLoadError {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const { data, content: body } = matter(content);
    const frontmatter = data as SuperpowerFrontmatter;

    // Get name from frontmatter or filename
    const filename = basename(filePath, '.md');
    const name = frontmatter.name || filename.replace(/^SUPERPOWER[-_]?/i, '');

    // Get trigger from frontmatter or derive from name
    const trigger = frontmatter.trigger || `/${name.toLowerCase()}`;

    // Parse steps from body
    const steps = parseSteps(body);

    if (steps.length === 0) {
      return {
        path: filePath,
        error: 'No valid steps found in superpower file',
      };
    }

    // Check if any step is multimodal
    const multimodal = frontmatter.multimodal ?? steps.some(s => s.multimodal);

    return {
      name,
      description: frontmatter.description || `Run the ${name} workflow`,
      trigger,
      multimodal,
      steps,
      sourcePath: filePath,
      builtin,
    };
  } catch (error) {
    return {
      path: filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Load superpowers from a directory
 */
function loadSuperpowersFromDir(
  dir: string,
  builtin: boolean
): { superpowers: Superpower[]; errors: SuperpowerLoadError[] } {
  const superpowers: Superpower[] = [];
  const errors: SuperpowerLoadError[] = [];

  if (!existsSync(dir)) {
    return { superpowers, errors };
  }

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      // Handle directory with SUPERPOWER.md inside
      if (stat.isDirectory()) {
        const superpowerFile = join(fullPath, 'SUPERPOWER.md');
        if (existsSync(superpowerFile)) {
          const result = loadSuperpowerFile(superpowerFile, builtin);
          if ('name' in result) {
            superpowers.push(result);
          } else {
            errors.push(result);
          }
        }
      }
      // Handle .md files directly
      else if (entry.endsWith('.md')) {
        const result = loadSuperpowerFile(fullPath, builtin);
        if ('name' in result) {
          superpowers.push(result);
        } else {
          errors.push(result);
        }
      }
    }
  } catch (error) {
    errors.push({
      path: dir,
      error: error instanceof Error ? error.message : 'Failed to read directory',
    });
  }

  return { superpowers, errors };
}

/**
 * Load all superpowers from all sources
 */
export function loadSuperpowers(cwd: string = process.cwd()): SuperpowersResult {
  // Return cached result if directory hasn't changed
  if (superpowersCache && cacheDir === cwd) {
    return superpowersCache;
  }

  const allSuperpowers: Superpower[] = [];
  const allErrors: SuperpowerLoadError[] = [];

  // Load built-in superpowers first
  const builtinPath = getBuiltinSuperpowersPath();
  const builtin = loadSuperpowersFromDir(builtinPath, true);
  allSuperpowers.push(...builtin.superpowers);
  allErrors.push(...builtin.errors);

  // Load global superpowers (can override built-in)
  const globalPath = getGlobalSuperpowersPath();
  const global = loadSuperpowersFromDir(globalPath, false);

  for (const sp of global.superpowers) {
    // Override built-in with same trigger
    const existingIdx = allSuperpowers.findIndex(s => s.trigger === sp.trigger);
    if (existingIdx >= 0) {
      allSuperpowers[existingIdx] = sp;
    } else {
      allSuperpowers.push(sp);
    }
  }
  allErrors.push(...global.errors);

  // Load project superpowers (highest priority)
  const projectPath = getProjectSuperpowersPath(cwd);
  const project = loadSuperpowersFromDir(projectPath, false);

  for (const sp of project.superpowers) {
    const existingIdx = allSuperpowers.findIndex(s => s.trigger === sp.trigger);
    if (existingIdx >= 0) {
      allSuperpowers[existingIdx] = sp;
    } else {
      allSuperpowers.push(sp);
    }
  }
  allErrors.push(...project.errors);

  // Cache the result
  superpowersCache = { superpowers: allSuperpowers, errors: allErrors };
  cacheDir = cwd;

  return superpowersCache;
}

/**
 * Get a specific superpower by trigger or name
 */
export function getSuperpower(triggerOrName: string, cwd?: string): Superpower | null {
  const { superpowers } = loadSuperpowers(cwd);

  // Normalize the trigger (add leading / if not present)
  const normalizedTrigger = triggerOrName.startsWith('/')
    ? triggerOrName
    : `/${triggerOrName}`;

  // First try exact trigger match
  let found = superpowers.find(s => s.trigger === normalizedTrigger);
  if (found) return found;

  // Then try name match (case-insensitive)
  const lowerName = triggerOrName.replace(/^\//, '').toLowerCase();
  found = superpowers.find(s => s.name.toLowerCase() === lowerName);

  return found || null;
}

/**
 * List all available superpower names
 */
export function listSuperpowerNames(cwd?: string): string[] {
  const { superpowers } = loadSuperpowers(cwd);
  return superpowers.map(s => s.name);
}

/**
 * List all available superpower triggers
 */
export function listSuperpowerTriggers(cwd?: string): string[] {
  const { superpowers } = loadSuperpowers(cwd);
  return superpowers.map(s => s.trigger);
}

/**
 * Format superpowers for inclusion in system prompt
 */
export function formatSuperpowersForPrompt(cwd?: string): string {
  const { superpowers } = loadSuperpowers(cwd);

  if (superpowers.length === 0) {
    return '';
  }

  const lines = superpowers.map(sp => {
    const steps = sp.steps.map(s => `${s.number}. ${s.name} (${s.model})`).join(', ');
    return `- ${sp.trigger}: ${sp.description} [Steps: ${steps}]`;
  });

  return `## Available Superpowers\n\nThese are multi-step workflows you can invoke:\n\n${lines.join('\n')}`;
}

/**
 * Clear the superpowers cache
 */
export function clearSuperpowersCache(): void {
  superpowersCache = null;
  cacheDir = null;
}
