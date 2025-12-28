/**
 * A skill is a reusable prompt template that can be invoked by name
 */
export interface Skill {
  /** Unique skill name (derived from filename) */
  name: string;
  /** Human-readable description */
  description: string;
  /** The skill prompt/content */
  content: string;
  /** Path to the skill file */
  path: string;
  /** Optional trigger patterns that auto-invoke this skill */
  triggers?: string[];
  /** Optional model tier to use for this skill */
  model?: 'superfast' | 'fast' | 'smart';
  /** Whether this skill is enabled */
  enabled?: boolean;
}

/**
 * Frontmatter fields in a skill markdown file
 */
export interface SkillFrontmatter {
  /** Human-readable description */
  description?: string;
  /** Trigger patterns */
  triggers?: string[];
  /** Model tier */
  model?: 'superfast' | 'fast' | 'smart';
  /** Whether enabled */
  enabled?: boolean;
}

/**
 * Result of loading skills
 */
export interface SkillsResult {
  /** Loaded skills */
  skills: Skill[];
  /** Paths that were searched */
  searchPaths: string[];
  /** Any errors encountered */
  errors: SkillLoadError[];
}

/**
 * Error when loading a skill
 */
export interface SkillLoadError {
  /** Path to the skill file */
  path: string;
  /** Error message */
  message: string;
}
