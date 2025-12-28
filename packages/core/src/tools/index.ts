import { ToolRegistry } from './registry.js';
import { readTool } from './read.js';
import { writeTool } from './write.js';
import { editTool } from './edit.js';
import { globTool } from './glob.js';
import { grepTool } from './grep.js';
import { bashTool } from './bash.js';

export { ToolRegistry } from './registry.js';
export { readTool } from './read.js';
export { writeTool } from './write.js';
export { editTool } from './edit.js';
export { globTool } from './glob.js';
export { grepTool } from './grep.js';
export { bashTool } from './bash.js';

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
] as const;

export type CoreToolName = (typeof CORE_TOOLS)[number];
