import { ToolRegistry } from './registry.js';
import { readTool } from './read.js';
import { writeTool } from './write.js';
import { editTool } from './edit.js';
import { globTool } from './glob.js';
import { grepTool } from './grep.js';
import { bashTool } from './bash.js';
import { todoWriteTool, getTodos, clearTodos } from './todowrite.js';
import { askUserQuestionTool, setAskQuestionPromptFn, clearAskQuestionPromptFn } from './askuserquestion.js';
import {
  enterPlanModeTool,
  exitPlanModeTool,
  setEnterPlanModeCallback,
  clearEnterPlanModeCallback,
  setExitPlanModeCallback,
  clearExitPlanModeCallback,
  getPlanModeState,
  isPlanModeActive,
  resetPlanModeState,
} from './planmode.js';
import {
  taskTool,
  setTaskRouterConfig,
  clearTaskRouterConfig,
  setConversationContext,
  clearConversationContext,
} from './task.js';
export type { TodoItem } from './todowrite.js';
export type { Question, QuestionOption, AskQuestionPromptFn } from './askuserquestion.js';
export type { PlanModeState, EnterPlanModeCallback, ExitPlanModeCallback } from './planmode.js';

export { ToolRegistry } from './registry.js';
export { readTool } from './read.js';
export { writeTool } from './write.js';
export { editTool } from './edit.js';
export { globTool } from './glob.js';
export { grepTool } from './grep.js';
export { bashTool } from './bash.js';
export { todoWriteTool, getTodos, clearTodos } from './todowrite.js';
export { askUserQuestionTool, setAskQuestionPromptFn, clearAskQuestionPromptFn } from './askuserquestion.js';
export {
  enterPlanModeTool,
  exitPlanModeTool,
  setEnterPlanModeCallback,
  clearEnterPlanModeCallback,
  setExitPlanModeCallback,
  clearExitPlanModeCallback,
  getPlanModeState,
  isPlanModeActive,
  resetPlanModeState,
} from './planmode.js';
export {
  taskTool,
  setTaskRouterConfig,
  clearTaskRouterConfig,
  setConversationContext,
  clearConversationContext,
} from './task.js';

/**
 * Create a registry with all core tools registered
 */
export function createCoreToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register(readTool);
  registry.register(writeTool);
  registry.register(editTool);
  registry.register(globTool);
  registry.register(grepTool);
  registry.register(bashTool);
  registry.register(todoWriteTool);
  registry.register(askUserQuestionTool);
  registry.register(enterPlanModeTool);
  registry.register(exitPlanModeTool);
  registry.register(taskTool);

  return registry;
}

/**
 * List of all core tool names
 */
export const CORE_TOOLS = [
  'read',
  'write',
  'edit',
  'glob',
  'grep',
  'bash',
  'todowrite',
  'askuserquestion',
  'enterplanmode',
  'exitplanmode',
  'task',
] as const;

export type CoreToolName = (typeof CORE_TOOLS)[number];
