import { existsSync, readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { homedir } from 'os';

const GUIDANCE_FILENAME = '10X.md';
const GLOBAL_CONFIG_DIR = join(homedir(), '.config', '10x');
const MAX_WALK_DEPTH = 20; // Safety limit for directory walking

/**
 * Result of loading guidance files
 */
export interface GuidanceResult {
  /** Combined guidance content */
  content: string;
  /** Sources where guidance was found */
  sources: string[];
  /** Whether any guidance was found */
  found: boolean;
}

/**
 * Load guidance from all applicable locations
 *
 * Search order (all are concatenated):
 * 1. Global: ~/.config/10x/10X.md
 * 2. Walk up from cwd to home directory
 * 3. Project root: ./10X.md (if not already included)
 */
export function loadGuidance(cwd: string = process.cwd()): GuidanceResult {
  const sources: string[] = [];
  const contents: string[] = [];
  const seenPaths = new Set<string>();

  // 1. Global guidance
  const globalPath = join(GLOBAL_CONFIG_DIR, GUIDANCE_FILENAME);
  if (existsSync(globalPath)) {
    const realPath = resolve(globalPath);
    if (!seenPaths.has(realPath)) {
      seenPaths.add(realPath);
      try {
        const content = readFileSync(globalPath, 'utf-8').trim();
        if (content) {
          contents.push(formatSection('Global Guidance', content));
          sources.push(globalPath);
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  // 2. Walk up from cwd to home directory
  const home = homedir();
  let currentDir = resolve(cwd);
  let depth = 0;

  while (depth < MAX_WALK_DEPTH) {
    const guidancePath = join(currentDir, GUIDANCE_FILENAME);
    const realPath = resolve(guidancePath);

    if (!seenPaths.has(realPath) && existsSync(guidancePath)) {
      seenPaths.add(realPath);
      try {
        const content = readFileSync(guidancePath, 'utf-8').trim();
        if (content) {
          const label = currentDir === cwd ? 'Project Guidance' : `Guidance (${currentDir})`;
          contents.push(formatSection(label, content));
          sources.push(guidancePath);
        }
      } catch {
        // Ignore read errors
      }
    }

    // Stop at home directory
    if (currentDir === home || currentDir === dirname(currentDir)) {
      break;
    }

    currentDir = dirname(currentDir);
    depth++;
  }

  return {
    content: contents.join('\n\n'),
    sources,
    found: contents.length > 0,
  };
}

/**
 * Load only project-level guidance (for quick access)
 */
export function loadProjectGuidance(cwd: string = process.cwd()): string | null {
  const guidancePath = join(cwd, GUIDANCE_FILENAME);

  if (existsSync(guidancePath)) {
    try {
      return readFileSync(guidancePath, 'utf-8').trim() || null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Load only global guidance
 */
export function loadGlobalGuidance(): string | null {
  const globalPath = join(GLOBAL_CONFIG_DIR, GUIDANCE_FILENAME);

  if (existsSync(globalPath)) {
    try {
      return readFileSync(globalPath, 'utf-8').trim() || null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Get the path where global guidance should be stored
 */
export function getGlobalGuidancePath(): string {
  return join(GLOBAL_CONFIG_DIR, GUIDANCE_FILENAME);
}

/**
 * Get the path where project guidance should be stored
 */
export function getProjectGuidancePath(cwd: string = process.cwd()): string {
  return join(cwd, GUIDANCE_FILENAME);
}

/**
 * Format a guidance section with a header
 */
function formatSection(label: string, content: string): string {
  return `## ${label}\n\n${content}`;
}

/**
 * Build a system prompt with guidance included
 */
export function buildSystemPromptWithGuidance(
  basePrompt: string,
  cwd: string = process.cwd(),
  maxGuidanceLength: number = 8000
): string {
  const guidance = loadGuidance(cwd);

  if (!guidance.found) {
    return basePrompt;
  }

  // Truncate if too long
  let guidanceContent = guidance.content;
  if (guidanceContent.length > maxGuidanceLength) {
    guidanceContent = guidanceContent.slice(0, maxGuidanceLength) + '\n\n[Guidance truncated due to length...]';
  }

  return `${basePrompt}

---

# Project & User Guidance

The following guidance has been provided by the user to customize your behavior:

${guidanceContent}

---

Follow the guidance above when applicable. It takes precedence over general instructions.`;
}

/**
 * Build a complete system prompt with guidance and skills
 */
export function buildFullSystemPrompt(
  basePrompt: string,
  skillsSection: string,
  cwd: string = process.cwd(),
  maxGuidanceLength: number = 8000
): string {
  let prompt = buildSystemPromptWithGuidance(basePrompt, cwd, maxGuidanceLength);

  if (skillsSection) {
    prompt += `\n\n---\n\n${skillsSection}`;
  }

  return prompt;
}
