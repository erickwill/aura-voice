import type { ModelTier } from '@10x/shared';

/**
 * A step in a superpower workflow
 */
export interface SuperpowerStep {
  /** Step number (1-indexed) */
  number: number;
  /** Step name/title */
  name: string;
  /** Which model tier to use for this step */
  model: ModelTier;
  /** The prompt template for this step */
  prompt: string;
  /** Whether this step uses the output from previous step */
  usesPreviousOutput?: boolean;
  /** Whether this step requires multimodal input */
  multimodal?: boolean;
  /** Optional tool restrictions for this step */
  tools?: string[];
}

/**
 * A superpower definition loaded from SUPERPOWER.md
 */
export interface Superpower {
  /** Unique name (derived from filename) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Trigger command (e.g., "/review", "/mockup") */
  trigger: string;
  /** Whether this superpower requires multimodal capabilities */
  multimodal: boolean;
  /** The ordered steps to execute */
  steps: SuperpowerStep[];
  /** Source file path */
  sourcePath: string;
  /** Whether this is a built-in superpower */
  builtin: boolean;
}

/**
 * Frontmatter for SUPERPOWER.md files
 */
export interface SuperpowerFrontmatter {
  name?: string;
  description?: string;
  trigger?: string;
  multimodal?: boolean;
}

/**
 * Result of loading superpowers
 */
export interface SuperpowersResult {
  superpowers: Superpower[];
  errors: SuperpowerLoadError[];
}

/**
 * Error that occurred while loading a superpower
 */
export interface SuperpowerLoadError {
  path: string;
  error: string;
}

/**
 * Context passed to superpower execution
 */
export interface SuperpowerContext {
  /** User's input/request */
  userInput: string;
  /** Current working directory */
  cwd: string;
  /** Image paths if multimodal */
  images?: string[];
  /** Variables from previous steps */
  stepOutputs: Map<number, string>;
}

/**
 * Result of a single step execution
 */
export interface StepResult {
  step: number;
  name: string;
  output: string;
  model: ModelTier;
  success: boolean;
  error?: string;
}

/**
 * Result of superpower execution
 */
export interface SuperpowerResult {
  superpower: string;
  success: boolean;
  steps: StepResult[];
  finalOutput: string;
  error?: string;
}

/**
 * Event emitted during superpower execution
 */
export type SuperpowerEvent =
  | { type: 'step_start'; step: number; name: string; model: ModelTier }
  | { type: 'step_text'; step: number; content: string }
  | { type: 'step_complete'; step: number; output: string }
  | { type: 'step_error'; step: number; error: string }
  | { type: 'complete'; result: SuperpowerResult };
