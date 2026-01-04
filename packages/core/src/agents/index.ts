/**
 * Agents module - Sub-agent system for the Task tool
 */

export type { AgentType, AgentConfig, AgentParams, AgentResult, AgentState } from './types.js';

export {
  executeAgent,
  getAgentConfig,
  listAgentTypes,
  getAgentState,
  clearAgentStates,
} from './executor.js';
