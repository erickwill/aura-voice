import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { homedir } from 'os';
import matter from 'gray-matter';
import type { Skill, SkillFrontmatter, SkillsResult, SkillLoadError } from './types.js';

const SKILLS_DIR_NAME = 'skills';
const GLOBAL_SKILLS_DIR = join(homedir(), '.config', '10x', SKILLS_DIR_NAME);
const PROJECT_SKILLS_DIR = '.10x/skills';

/**
 * Load all skills from global and project directories
 */
export function loadSkills(cwd: string = process.cwd()): SkillsResult {
  const skills: Skill[] = [];
  const errors: SkillLoadError[] = [];
  const searchPaths: string[] = [];
  const seenNames = new Set<string>();

  // Load from project skills first (higher priority)
  const projectSkillsDir = join(cwd, PROJECT_SKILLS_DIR);
  searchPaths.push(projectSkillsDir);
  if (existsSync(projectSkillsDir)) {
    const projectSkills = loadSkillsFromDir(projectSkillsDir, errors);
    for (const skill of projectSkills) {
      if (!seenNames.has(skill.name)) {
        seenNames.add(skill.name);
        skills.push(skill);
      }
    }
  }

  // Load from global skills (lower priority, won't override project skills)
  searchPaths.push(GLOBAL_SKILLS_DIR);
  if (existsSync(GLOBAL_SKILLS_DIR)) {
    const globalSkills = loadSkillsFromDir(GLOBAL_SKILLS_DIR, errors);
    for (const skill of globalSkills) {
      if (!seenNames.has(skill.name)) {
        seenNames.add(skill.name);
        skills.push(skill);
      }
    }
  }

  return { skills, searchPaths, errors };
}

/**
 * Load skills from a specific directory
 */
function loadSkillsFromDir(dir: string, errors: SkillLoadError[]): Skill[] {
  const skills: Skill[] = [];

  try {
    const files = readdirSync(dir);

    for (const file of files) {
      const ext = extname(file).toLowerCase();
      if (ext !== '.md' && ext !== '.markdown') continue;

      const filePath = join(dir, file);
      const skill = loadSkillFile(filePath);

      if (skill) {
        skills.push(skill);
      } else {
        errors.push({
          path: filePath,
          message: 'Failed to parse skill file',
        });
      }
    }
  } catch (err) {
    errors.push({
      path: dir,
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  return skills;
}

/**
 * Load a single skill file
 */
function loadSkillFile(filePath: string): Skill | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const { data, content: body } = matter(content);
    const frontmatter = data as SkillFrontmatter;

    // Derive name from filename
    const filename = basename(filePath);
    const name = filename.replace(/\.(md|markdown)$/i, '');

    return {
      name,
      description: frontmatter.description || `Skill: ${name}`,
      content: body.trim(),
      path: filePath,
      triggers: frontmatter.triggers,
      model: frontmatter.model,
      enabled: frontmatter.enabled !== false, // Default to enabled
    };
  } catch {
    return null;
  }
}

/**
 * Get a skill by name
 */
export function getSkill(name: string, cwd: string = process.cwd()): Skill | null {
  const { skills } = loadSkills(cwd);
  return skills.find((s) => s.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * List available skill names
 */
export function listSkillNames(cwd: string = process.cwd()): string[] {
  const { skills } = loadSkills(cwd);
  return skills.filter((s) => s.enabled).map((s) => s.name);
}

/**
 * Get the global skills directory path
 */
export function getGlobalSkillsPath(): string {
  return GLOBAL_SKILLS_DIR;
}

/**
 * Get the project skills directory path
 */
export function getProjectSkillsPath(cwd: string = process.cwd()): string {
  return join(cwd, PROJECT_SKILLS_DIR);
}

/**
 * Format skills for inclusion in system prompt
 */
export function formatSkillsForPrompt(skills: Skill[]): string {
  const enabledSkills = skills.filter((s) => s.enabled);

  if (enabledSkills.length === 0) {
    return '';
  }

  const skillList = enabledSkills
    .map((s) => `- **/${s.name}**: ${s.description}`)
    .join('\n');

  return `## Available Skills

The user can invoke the following skills by typing their name as a command:

${skillList}

When a skill is invoked, follow its instructions carefully.`;
}

/**
 * Build system prompt section with skills
 */
export function buildSkillsPromptSection(cwd: string = process.cwd()): string {
  const { skills } = loadSkills(cwd);
  return formatSkillsForPrompt(skills);
}
