/**
 * Plan Mode Tools
 *
 * EnterPlanMode and ExitPlanMode tools for structured planning workflow.
 * These are "marker" tools that signal mode transitions to the CLI.
 */

import { z } from 'zod';
import type { Tool } from './registry.js';
import { ENTERPLANMODE_DESCRIPTION, EXITPLANMODE_DESCRIPTION } from '../prompts/index.js';

// Plan mode state
export interface PlanModeState {
  active: boolean;
  planFilePath: string | null;
  originalTask: string | null;
}

// Callback types for CLI integration
export type EnterPlanModeCallback = (task: string) => Promise<{ approved: boolean; planFilePath: string }>;
export type ExitPlanModeCallback = (planFilePath: string) => Promise<{ approved: boolean; planContent: string }>;

// Module-level callbacks (set by CLI)
let enterPlanModeCallback: EnterPlanModeCallback | null = null;
let exitPlanModeCallback: ExitPlanModeCallback | null = null;

// Current plan mode state
let planModeState: PlanModeState = {
  active: false,
  planFilePath: null,
  originalTask: null,
};

/**
 * Set the callback for entering plan mode
 */
export function setEnterPlanModeCallback(callback: EnterPlanModeCallback): void {
  enterPlanModeCallback = callback;
}

/**
 * Clear the enter plan mode callback
 */
export function clearEnterPlanModeCallback(): void {
  enterPlanModeCallback = null;
}

/**
 * Set the callback for exiting plan mode
 */
export function setExitPlanModeCallback(callback: ExitPlanModeCallback): void {
  exitPlanModeCallback = callback;
}

/**
 * Clear the exit plan mode callback
 */
export function clearExitPlanModeCallback(): void {
  exitPlanModeCallback = null;
}

/**
 * Get current plan mode state
 */
export function getPlanModeState(): PlanModeState {
  return { ...planModeState };
}

/**
 * Check if plan mode is active
 */
export function isPlanModeActive(): boolean {
  return planModeState.active;
}

/**
 * Reset plan mode state (for testing or cleanup)
 */
export function resetPlanModeState(): void {
  planModeState = {
    active: false,
    planFilePath: null,
    originalTask: null,
  };
}

/**
 * EnterPlanMode tool
 */
export const enterPlanModeTool: Tool = {
  name: 'enterplanmode',
  description: ENTERPLANMODE_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_params: Record<string, unknown>) {
    // If no callback, return instruction message
    if (!enterPlanModeCallback) {
      return {
        success: true,
        output: `Entering plan mode. In plan mode, you should:

1. Explore the codebase using Glob, Grep, and Read tools
2. Understand existing patterns and architecture
3. Write your implementation plan to a markdown file
4. Use AskUserQuestion if you need to clarify approaches
5. Call ExitPlanMode when your plan is ready for review

Note: Write tools (Write, Edit, Bash with side effects) are restricted in plan mode.
Focus on research and planning, not implementation.`,
      };
    }

    try {
      // Get the original task context (would be passed from conversation context)
      const task = 'Implementation task'; // Placeholder - actual task comes from conversation

      const result = await enterPlanModeCallback(task);

      if (!result.approved) {
        return {
          success: false,
          output: 'User declined to enter plan mode. Proceed with direct implementation or ask for clarification.',
        };
      }

      // Update state
      planModeState = {
        active: true,
        planFilePath: result.planFilePath,
        originalTask: task,
      };

      return {
        success: true,
        output: `Entered plan mode. Write your implementation plan to: ${result.planFilePath}

In plan mode, you should:
1. Explore the codebase using Glob, Grep, and Read tools
2. Understand existing patterns and architecture
3. Write your plan to the file above
4. Use AskUserQuestion if you need to clarify approaches
5. Call ExitPlanMode when your plan is ready for review

Note: Write tools are restricted to the plan file only.`,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to enter plan mode: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * ExitPlanMode tool
 */
export const exitPlanModeTool: Tool = {
  name: 'exitplanmode',
  description: EXITPLANMODE_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_params: Record<string, unknown>) {
    // Check if we're in plan mode
    if (!planModeState.active) {
      return {
        success: false,
        output: 'Not currently in plan mode. Use EnterPlanMode first to start planning.',
      };
    }

    // If no callback, return instruction message
    if (!exitPlanModeCallback) {
      const planPath = planModeState.planFilePath || 'the plan file';

      // Reset state
      planModeState = {
        active: false,
        planFilePath: null,
        originalTask: null,
      };

      return {
        success: true,
        output: `Exiting plan mode. The plan has been written to ${planPath}.

The user should review the plan before implementation proceeds.
Plan mode restrictions have been lifted - you can now use all tools.`,
      };
    }

    try {
      const planFilePath = planModeState.planFilePath;

      if (!planFilePath) {
        return {
          success: false,
          output: 'No plan file path set. Something went wrong with plan mode state.',
        };
      }

      const result = await exitPlanModeCallback(planFilePath);

      // Reset state regardless of approval
      const previousPlanPath = planModeState.planFilePath;
      planModeState = {
        active: false,
        planFilePath: null,
        originalTask: null,
      };

      if (!result.approved) {
        return {
          success: false,
          output: `User did not approve the plan. The plan file is at: ${previousPlanPath}

Please either:
1. Revise the plan based on user feedback and call ExitPlanMode again
2. Use AskUserQuestion to clarify requirements
3. Proceed with a different approach`,
        };
      }

      return {
        success: true,
        output: `Plan approved! Exiting plan mode.

Plan content:
${result.planContent}

You can now proceed with implementation following the approved plan.
All tools are now available.`,
      };
    } catch (error) {
      return {
        success: false,
        output: `Failed to exit plan mode: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
