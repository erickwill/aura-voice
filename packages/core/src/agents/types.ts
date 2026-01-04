/**
 * Agent type definitions for the Task tool
 */

import type { ModelTier } from '@10x/shared';

/**
 * Available agent types
 */
export type AgentType = 'Explore' | 'Summarize' | 'ReviewPR' | 'TitleGen' | 'Plan';

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** System prompt for the agent */
  prompt: string;
  /** List of tool names the agent can use */
  tools: string[];
  /** Default model tier for the agent */
  defaultTier: ModelTier;
  /** Whether the agent is read-only (no file modifications) */
  readOnly: boolean;
  /** Description of what the agent does */
  description: string;
}

/**
 * Parameters for launching an agent
 */
export interface AgentParams {
  /** Short description of the task (3-5 words) */
  description: string;
  /** The task prompt for the agent */
  prompt: string;
  /** Type of agent to use */
  subagent_type: AgentType | string;
  /** Optional: run in background */
  run_in_background?: boolean;
  /** Optional: agent ID to resume */
  resume?: string;
  /** Optional: model tier override */
  model?: ModelTier;
}

/**
 * Result from an agent execution
 */
export interface AgentResult {
  /** Whether the agent completed successfully */
  success: boolean;
  /** Output from the agent */
  output: string;
  /** Unique agent ID for resumption */
  agentId: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Agent execution state (for resumption)
 */
export interface AgentState {
  id: string;
  type: AgentType;
  params: AgentParams;
  messages: unknown[];
  status: 'running' | 'completed' | 'error' | 'background';
  result?: AgentResult;
  createdAt: Date;
  updatedAt: Date;
}
