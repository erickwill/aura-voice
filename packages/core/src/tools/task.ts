/**
 * Task Tool - Launches specialized sub-agents for complex tasks
 */

import type { Tool } from './registry.js';
import { TASK_DESCRIPTION } from '../prompts/index.js';
import { executeAgent, listAgentTypes } from '../agents/index.js';
import type { AgentParams } from '../agents/index.js';
import type { RouterConfig } from '../router/index.js';
import type { ChatMessage, ModelTier } from '@10x/shared';

// Router config will be injected via setTaskRouterConfig
let routerConfig: Omit<RouterConfig, 'tools' | 'systemPrompt'> | null = null;

// Conversation context for summarization (injected by CLI)
let conversationContext: ChatMessage[] = [];

/**
 * Set the router configuration for task execution
 * This must be called before the task tool can execute agents
 */
export function setTaskRouterConfig(config: Omit<RouterConfig, 'tools' | 'systemPrompt'>): void {
  routerConfig = config;
}

/**
 * Clear the router configuration
 */
export function clearTaskRouterConfig(): void {
  routerConfig = null;
}

/**
 * Set the conversation context for summarization agents
 */
export function setConversationContext(messages: ChatMessage[]): void {
  conversationContext = messages;
}

/**
 * Clear the conversation context
 */
export function clearConversationContext(): void {
  conversationContext = [];
}

/**
 * Task tool for launching sub-agents
 */
export const taskTool: Tool = {
  name: 'task',
  description: TASK_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: 'A short (3-5 word) description of the task',
      },
      prompt: {
        type: 'string',
        description: 'The task for the agent to perform',
      },
      subagent_type: {
        type: 'string',
        description: `The type of specialized agent to use. Available: ${listAgentTypes().join(', ')}`,
        enum: listAgentTypes(),
      },
      run_in_background: {
        type: 'boolean',
        description: 'Set to true to run this agent in the background (not yet supported)',
      },
      resume: {
        type: 'string',
        description: 'Optional agent ID to resume from a previous invocation',
      },
      model: {
        type: 'string',
        description: 'Optional model tier override (superfast, fast, smart)',
        enum: ['superfast', 'fast', 'smart'],
      },
    },
    required: ['description', 'prompt', 'subagent_type'],
  },
  async execute(params: Record<string, unknown>, signal?: AbortSignal) {
    const agentParams = params as unknown as AgentParams;

    // Validate required parameters
    if (!agentParams.description) {
      return {
        success: false,
        error: 'Missing required parameter: description',
      };
    }
    if (!agentParams.prompt) {
      return {
        success: false,
        error: 'Missing required parameter: prompt',
      };
    }
    if (!agentParams.subagent_type) {
      return {
        success: false,
        error: `Missing required parameter: subagent_type. Available types: ${listAgentTypes().join(', ')}`,
      };
    }

    // Check for router config
    if (!routerConfig) {
      return {
        success: false,
        error: 'Task tool not configured. Router configuration must be set before executing agents.',
      };
    }

    // Check for background execution (not yet supported)
    if (agentParams.run_in_background) {
      return {
        success: false,
        error: 'Background agent execution is not yet supported. Please run agents synchronously.',
      };
    }

    try {
      // Execute the agent
      const result = await executeAgent(
        agentParams,
        routerConfig,
        conversationContext,
        signal
      );

      if (result.success) {
        return {
          success: true,
          output: `Agent completed (ID: ${result.agentId}):\n\n${result.output}`,
        };
      } else {
        return {
          success: false,
          error: result.error ?? 'Agent execution failed',
          output: `Agent failed (ID: ${result.agentId}): ${result.error}`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Agent execution was cancelled',
        };
      }

      return {
        success: false,
        error: `Agent execution error: ${errorMessage}`,
      };
    }
  },
};
