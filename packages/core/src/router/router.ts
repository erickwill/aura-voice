import { OpenRouterClient } from '../providers/openrouter.js';
import { ToolRegistry } from '../tools/registry.js';
import type {
  ModelTier,
  ChatMessage,
  ChatRequest,
  ToolCall,
  ToolResult,
} from '@10x/shared';

export interface RouterConfig {
  client: OpenRouterClient;
  tools?: ToolRegistry;
  defaultTier?: ModelTier;
  systemPrompt?: string;
}

const TIER_MODELS: Record<ModelTier, string> = {
  superfast: 'openai/gpt-oss-safeguard-20b',
  fast: 'moonshotai/kimi-k2-0905',
  smart: 'anthropic/claude-opus-4.5',
};

// Use Groq provider for speed on superfast and fast tiers
const TIER_PROVIDERS: Record<ModelTier, string | undefined> = {
  superfast: 'groq',
  fast: 'groq',
  smart: undefined,
};

// Vision-capable models for multimodal
const VISION_MODEL = 'google/gemini-2.0-flash-001';

// Simple heuristics for task classification
const SIMPLE_PATTERNS = [
  /^(what|how|why|when|where|who|which|explain|describe)/i,
  /^(list|show|tell|give)/i,
  /fix\s+(this|the)\s+(typo|error|bug)/i,
  /add\s+(a\s+)?comment/i,
  /rename\s+\w+\s+to/i,
];

const COMPLEX_PATTERNS = [
  /implement|create|build|develop|design/i,
  /refactor|rewrite|restructure|redesign/i,
  /debug|investigate|analyze|diagnose/i,
  /multiple\s+files/i,
  /across\s+(the\s+)?(codebase|project|repo)/i,
  /architecture|system|infrastructure/i,
];

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'usage';
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  tier?: ModelTier;
  usage?: TokenUsage;
}

export class Router {
  private client: OpenRouterClient;
  private tools: ToolRegistry | null;
  private defaultTier: ModelTier;
  private systemPrompt: string;

  constructor(config: RouterConfig) {
    this.client = config.client;
    this.tools = config.tools ?? null;
    this.defaultTier = config.defaultTier ?? 'smart';
    this.systemPrompt = config.systemPrompt ?? '';
  }

  /**
   * Classify a task to determine the appropriate model tier
   */
  async classify(input: string): Promise<ModelTier> {
    // Quick heuristic check
    const heuristicTier = this.classifyHeuristic(input);
    if (heuristicTier) {
      return heuristicTier;
    }

    // For now, fall back to default tier
    return this.defaultTier;
  }

  /**
   * Heuristic-based classification (fast, no API call)
   */
  private classifyHeuristic(input: string): ModelTier | null {
    // Check for complex patterns first
    for (const pattern of COMPLEX_PATTERNS) {
      if (pattern.test(input)) {
        return 'smart';
      }
    }

    // Check for simple patterns
    for (const pattern of SIMPLE_PATTERNS) {
      if (pattern.test(input)) {
        if (input.length < 100) {
          return 'superfast';
        }
        return 'fast';
      }
    }

    return null;
  }

  /**
   * Complete a request with automatic tier selection (non-streaming)
   */
  async complete(
    messages: ChatMessage[],
    tier?: ModelTier
  ): Promise<{ content: string; tier: ModelTier; toolCalls?: ToolCall[]; usage?: TokenUsage }> {
    const selectedTier =
      tier ?? (await this.classify((messages[messages.length - 1]?.content as string) ?? ''));
    const model = TIER_MODELS[selectedTier];

    // Add provider routing for speed tiers
    const provider = TIER_PROVIDERS[selectedTier];

    const request: ChatRequest = {
      model,
      messages: this.systemPrompt
        ? [{ role: 'system', content: this.systemPrompt }, ...messages]
        : messages,
      tools: this.tools?.toOpenRouterTools(),
      ...(provider && { provider: { order: [provider] } }),
    };

    const response = await this.client.chat(request);
    const choice = response.choices[0];
    const content = choice?.message?.content ?? '';

    // Handle tool calls
    const toolCalls: ToolCall[] = [];
    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        const toolCall: ToolCall = {
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments),
          status: 'pending',
        };
        toolCalls.push(toolCall);
      }
    }

    // Extract usage information
    const usage: TokenUsage | undefined = response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined;

    return { content, tier: selectedTier, toolCalls, usage };
  }

  /**
   * Stream a completion with tool support
   */
  async *stream(
    messages: ChatMessage[],
    tier?: ModelTier,
    hasImages?: boolean,
    signal?: AbortSignal
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const lastContent = messages[messages.length - 1]?.content;
    const contentForClassify = typeof lastContent === 'string' ? lastContent : '';
    const selectedTier =
      tier ?? (await this.classify(contentForClassify));
    // Use vision model for images, otherwise use tier model
    const model = hasImages ? VISION_MODEL : TIER_MODELS[selectedTier];

    // Build the conversation with system prompt
    const fullMessages: ChatMessage[] = this.systemPrompt
      ? [{ role: 'system', content: this.systemPrompt }, ...messages]
      : [...messages];

    let continueLoop = true;

    // Add provider routing for speed tiers (not for vision model)
    const provider = hasImages ? undefined : TIER_PROVIDERS[selectedTier];

    while (continueLoop) {
      // Check for abort at the start of each loop iteration
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      continueLoop = false;

      const request: ChatRequest = {
        model,
        messages: fullMessages,
        tools: this.tools?.toOpenRouterTools(),
        ...(provider && { provider: { order: [provider] } }),
      };

      let currentContent = '';
      const toolCalls: Map<number, { id: string; name: string; args: string }> =
        new Map();

      for await (const chunk of this.client.chatStream(request, signal)) {
        const delta = chunk.choices[0]?.delta;

        // Handle text content
        if (delta?.content) {
          currentContent += delta.content;
          yield {
            type: 'text',
            content: delta.content,
            tier: selectedTier,
          };
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = toolCalls.get(tc.index);
            if (existing) {
              if (tc.function?.arguments) {
                existing.args += tc.function.arguments;
              }
            } else {
              toolCalls.set(tc.index, {
                id: tc.id ?? `call_${tc.index}`,
                name: tc.function?.name ?? '',
                args: tc.function?.arguments ?? '',
              });
            }
          }
        }

        // Check for finish
        if (chunk.choices[0]?.finish_reason === 'tool_calls') {
          // Execute tool calls
          for (const [, tc] of toolCalls) {
            // Check for abort before each tool execution
            if (signal?.aborted) {
              throw new DOMException('Aborted', 'AbortError');
            }

            const toolCall: ToolCall = {
              id: tc.id,
              name: tc.name,
              input: JSON.parse(tc.args || '{}'),
              status: 'running',
            };

            yield { type: 'tool_call', toolCall, tier: selectedTier };

            // Execute the tool
            if (this.tools) {
              const result = await this.tools.execute(tc.name, toolCall.input, signal);
              toolCall.output = result;
              toolCall.status = result.success ? 'success' : 'error';

              yield { type: 'tool_result', toolCall, toolResult: result, tier: selectedTier };

              // Add tool result to messages for continuation
              fullMessages.push({
                role: 'assistant',
                content: currentContent || null,
                tool_calls: [
                  {
                    id: tc.id,
                    type: 'function',
                    function: { name: tc.name, arguments: tc.args },
                  },
                ],
              } as any);

              fullMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: result.output ?? result.error ?? 'No output',
              } as any);
            }
          }

          // Continue the loop to get the model's response to the tool results
          continueLoop = toolCalls.size > 0;
          currentContent = '';
          toolCalls.clear();
        }

        if (chunk.choices[0]?.finish_reason === 'stop') {
          yield { type: 'done', tier: selectedTier };
        }
      }
    }
  }

  /**
   * Set the system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  /**
   * Set the default tier
   */
  setDefaultTier(tier: ModelTier): void {
    this.defaultTier = tier;
  }

  /**
   * Set the tools registry
   */
  setTools(tools: ToolRegistry): void {
    this.tools = tools;
  }
}
