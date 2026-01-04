/**
 * Agent Executor - Runs sub-agents with restricted tool access
 */

import { Router, type RouterConfig, type StreamEvent } from '../router/index.js';
import { ToolRegistry } from '../tools/registry.js';
import { readTool, globTool, grepTool, bashTool } from '../tools/index.js';
import {
  EXPLORE_AGENT_PROMPT,
  SUMMARIZATION_AGENT_PROMPT,
  REVIEW_PR_AGENT_PROMPT,
  TITLE_GEN_AGENT_PROMPT,
} from '../prompts/index.js';
import type { AgentType, AgentConfig, AgentParams, AgentResult, AgentState } from './types.js';
import type { ChatMessage, ModelTier } from '@10x/shared';

// Agent configurations
const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  Explore: {
    prompt: EXPLORE_AGENT_PROMPT,
    tools: ['read', 'glob', 'grep', 'bash'],
    defaultTier: 'fast',
    readOnly: true,
    description: 'Fast agent specialized for exploring codebases',
  },
  Summarize: {
    prompt: SUMMARIZATION_AGENT_PROMPT,
    tools: [], // No tools needed - just processes conversation context
    defaultTier: 'fast',
    readOnly: true,
    description: 'Summarizes conversation context',
  },
  ReviewPR: {
    prompt: REVIEW_PR_AGENT_PROMPT,
    tools: ['read', 'glob', 'grep', 'bash'],
    defaultTier: 'smart',
    readOnly: true,
    description: 'Reviews pull requests and code changes',
  },
  TitleGen: {
    prompt: TITLE_GEN_AGENT_PROMPT,
    tools: [], // No tools needed
    defaultTier: 'superfast',
    readOnly: true,
    description: 'Generates session titles and branch names',
  },
  Plan: {
    prompt: '', // Will use the task prompt directly
    tools: ['read', 'glob', 'grep'],
    defaultTier: 'smart',
    readOnly: true,
    description: 'Plans implementation approaches',
  },
};

// Generate unique agent ID
function generateAgentId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Store for agent states (for resumption)
const agentStates: Map<string, AgentState> = new Map();

/**
 * Create a limited tool registry for an agent
 */
function createAgentToolRegistry(toolNames: string[]): ToolRegistry {
  const registry = new ToolRegistry();

  // Map of available tools
  const toolMap: Record<string, typeof readTool> = {
    read: readTool,
    glob: globTool,
    grep: grepTool,
    bash: bashTool,
  };

  for (const name of toolNames) {
    const tool = toolMap[name];
    if (tool) {
      registry.register(tool);
    }
  }

  return registry;
}

/**
 * Get agent configuration
 */
export function getAgentConfig(agentType: string): AgentConfig | null {
  return AGENT_CONFIGS[agentType as AgentType] ?? null;
}

/**
 * List available agent types
 */
export function listAgentTypes(): AgentType[] {
  return Object.keys(AGENT_CONFIGS) as AgentType[];
}

/**
 * Get agent state for resumption
 */
export function getAgentState(agentId: string): AgentState | undefined {
  return agentStates.get(agentId);
}

/**
 * Execute an agent synchronously
 */
export async function executeAgent(
  params: AgentParams,
  routerConfig: Omit<RouterConfig, 'tools' | 'systemPrompt'>,
  context?: ChatMessage[],
  signal?: AbortSignal
): Promise<AgentResult> {
  const agentId = params.resume ?? generateAgentId();
  const agentType = params.subagent_type as AgentType;

  // Get agent configuration
  const config = getAgentConfig(agentType);
  if (!config) {
    return {
      success: false,
      output: '',
      agentId,
      error: `Unknown agent type: ${params.subagent_type}. Available types: ${listAgentTypes().join(', ')}`,
    };
  }

  // Check for resumption
  if (params.resume) {
    const existingState = agentStates.get(params.resume);
    if (existingState && existingState.status === 'completed' && existingState.result) {
      return existingState.result;
    }
  }

  // Create agent state
  const agentState: AgentState = {
    id: agentId,
    type: agentType,
    params,
    messages: [],
    status: 'running',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  agentStates.set(agentId, agentState);

  try {
    // Create limited tool registry for agent
    const tools = createAgentToolRegistry(config.tools);

    // Build system prompt
    const systemPrompt = config.prompt
      ? `${config.prompt}\n\nTask: ${params.prompt}`
      : params.prompt;

    // Create sub-router with limited tools
    const subRouter = new Router({
      ...routerConfig,
      tools,
      systemPrompt,
    });

    // Build messages - include context if provided (for summarization)
    const messages: ChatMessage[] = [];

    if (context && context.length > 0) {
      // For summarization agent, pass the full context
      if (agentType === 'Summarize') {
        // Format context as a single message
        const contextText = context
          .map((msg) => `${msg.role}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`)
          .join('\n\n---\n\n');
        messages.push({
          role: 'user',
          content: `Here is the conversation to summarize:\n\n${contextText}\n\n---\n\n${params.prompt}`,
        });
      } else {
        messages.push({ role: 'user', content: params.prompt });
      }
    } else {
      messages.push({ role: 'user', content: params.prompt });
    }

    // Determine model tier
    const tier: ModelTier = params.model ?? config.defaultTier;

    // Collect output from stream
    let output = '';

    for await (const event of subRouter.stream(messages, tier, false, signal)) {
      if (event.type === 'text' && event.content) {
        output += event.content;
      }
      // We don't expose tool events to the parent - just collect the final output
    }

    // Update state
    agentState.status = 'completed';
    agentState.updatedAt = new Date();
    const result: AgentResult = {
      success: true,
      output,
      agentId,
    };
    agentState.result = result;

    return result;
  } catch (error) {
    agentState.status = 'error';
    agentState.updatedAt = new Date();

    const errorMessage = error instanceof Error ? error.message : String(error);
    const result: AgentResult = {
      success: false,
      output: '',
      agentId,
      error: errorMessage,
    };
    agentState.result = result;

    return result;
  }
}

/**
 * Clear all agent states (for testing)
 */
export function clearAgentStates(): void {
  agentStates.clear();
}
