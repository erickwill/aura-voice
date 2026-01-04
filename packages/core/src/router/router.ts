import { streamText, jsonSchema, type ModelMessage, type Tool as AITool, type ToolResultPart } from 'ai';
import { OpenRouterClient } from '../providers/openrouter.js';
import { getLanguageModel, type AIProviderConfig } from '../providers/ai-provider.js';
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
  aiProviderConfig: AIProviderConfig;
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

// Doom loop detection: if the same tool is called N times with identical args, stop
const DOOM_LOOP_THRESHOLD = 3;

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
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'usage' | 'doom_loop';
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  tier?: ModelTier;
  usage?: TokenUsage;
  doomLoop?: {
    tool: string;
    input: Record<string, unknown>;
    count: number;
  };
}

// Helper to create a fingerprint for tool call comparison
function getToolCallFingerprint(name: string, input: Record<string, unknown>): string {
  return `${name}:${JSON.stringify(input)}`;
}

export class Router {
  private client: OpenRouterClient;
  private aiProviderConfig: AIProviderConfig;
  private tools: ToolRegistry | null;
  private defaultTier: ModelTier;
  private systemPrompt: string;

  constructor(config: RouterConfig) {
    this.client = config.client;
    this.aiProviderConfig = config.aiProviderConfig;
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
   * Convert ChatMessage to ModelMessage format for AI SDK
   */
  private convertToModelMessages(messages: ChatMessage[]): ModelMessage[] {
    return messages.map((msg): ModelMessage => {
      if (msg.role === 'system') {
        return {
          role: 'system',
          content: typeof msg.content === 'string' ? msg.content : '',
        };
      }
      if (msg.role === 'user') {
        // Handle multimodal content
        if (Array.isArray(msg.content)) {
          return {
            role: 'user',
            content: msg.content.map(part => {
              if (part.type === 'text') {
                return { type: 'text' as const, text: part.text };
              }
              if (part.type === 'image_url') {
                return { type: 'image' as const, image: part.image_url.url };
              }
              return { type: 'text' as const, text: '' };
            }),
          };
        }
        return { role: 'user', content: msg.content };
      }
      // Assistant messages
      return {
        role: 'assistant',
        content: typeof msg.content === 'string' ? msg.content : '',
      };
    });
  }

  /**
   * Convert ToolRegistry to AI SDK Tool format
   */
  private getAISDKTools(): Record<string, AITool> | undefined {
    if (!this.tools) return undefined;

    const openRouterTools = this.tools.toOpenRouterTools();
    if (!openRouterTools?.length) return undefined;

    const sdkTools: Record<string, AITool> = {};

    for (const tool of openRouterTools) {
      const toolName = tool.function.name;
      sdkTools[toolName] = {
        description: tool.function.description,
        inputSchema: jsonSchema(tool.function.parameters as Parameters<typeof jsonSchema>[0]),
        // Don't provide execute - we'll handle tool execution manually for doom loop detection
      };
    }

    return sdkTools;
  }

  /**
   * Stream a completion with tool support using Vercel AI SDK
   */
  async *stream(
    messages: ChatMessage[],
    tier?: ModelTier,
    hasImages?: boolean,
    signal?: AbortSignal
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const lastContent = messages[messages.length - 1]?.content;
    const contentForClassify = typeof lastContent === 'string' ? lastContent : '';
    const selectedTier = tier ?? (await this.classify(contentForClassify));

    // Use vision model for images, otherwise use tier model
    const modelId = hasImages ? VISION_MODEL : TIER_MODELS[selectedTier];
    const model = getLanguageModel(this.aiProviderConfig, modelId);

    // Build the conversation with system prompt
    const baseMessages = this.systemPrompt
      ? [{ role: 'system' as const, content: this.systemPrompt }, ...messages]
      : [...messages];

    // Convert to ModelMessage format
    let modelMessages = this.convertToModelMessages(baseMessages);

    // Get tools in AI SDK format
    const tools = this.getAISDKTools();

    // Track recent tool calls for doom loop detection
    const recentToolCalls: string[] = [];

    // Track accumulated usage
    let totalUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    let continueLoop = true;

    while (continueLoop) {
      // Check for abort at the start of each loop iteration
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      continueLoop = false;

      const result = streamText({
        model,
        messages: modelMessages,
        tools,
        abortSignal: signal,
        maxRetries: 3,
        // Don't use maxSteps - we handle the loop ourselves for doom loop detection
      });

      // Track tool calls and results for this iteration
      const pendingToolCalls: Map<string, ToolCall> = new Map();
      const toolResults: ToolResultPart[] = [];

      // Process the stream
      for await (const event of result.fullStream) {
        switch (event.type) {
          case 'text-delta': {
            yield {
              type: 'text',
              content: event.text,
              tier: selectedTier,
            };
            break;
          }

          case 'tool-call': {
            const toolCall: ToolCall = {
              id: event.toolCallId,
              name: event.toolName,
              input: event.input as Record<string, unknown>,
              status: 'running',
            };

            // Check for doom loop before executing
            const fingerprint = getToolCallFingerprint(event.toolName, toolCall.input);
            recentToolCalls.push(fingerprint);

            // Check if the last N calls are identical
            if (recentToolCalls.length >= DOOM_LOOP_THRESHOLD) {
              const lastN = recentToolCalls.slice(-DOOM_LOOP_THRESHOLD);
              const allIdentical = lastN.every(fp => fp === fingerprint);

              if (allIdentical) {
                // Doom loop detected!
                yield {
                  type: 'doom_loop',
                  tier: selectedTier,
                  doomLoop: {
                    tool: event.toolName,
                    input: toolCall.input,
                    count: DOOM_LOOP_THRESHOLD,
                  },
                };

                // Return error result for this tool call
                toolCall.status = 'error';
                toolCall.output = {
                  success: false,
                  error: `Doom loop detected: "${event.toolName}" called ${DOOM_LOOP_THRESHOLD} times with identical arguments. Breaking loop to prevent infinite execution.`,
                };

                yield { type: 'tool_result', toolCall, toolResult: toolCall.output, tier: selectedTier };

                // Add to tool results so the model knows what happened
                toolResults.push({
                  type: 'tool-result',
                  toolCallId: event.toolCallId,
                  toolName: event.toolName,
                  output: { type: 'text', value: toolCall.output.error ?? 'Error' },
                });

                continue; // Skip actual execution
              }
            }

            yield { type: 'tool_call', toolCall, tier: selectedTier };
            pendingToolCalls.set(event.toolCallId, toolCall);

            // Execute the tool
            if (this.tools) {
              // Check for abort before each tool execution
              if (signal?.aborted) {
                throw new DOMException('Aborted', 'AbortError');
              }

              const toolResult = await this.tools.execute(event.toolName, toolCall.input, signal);
              toolCall.output = toolResult;
              toolCall.status = toolResult.success ? 'success' : 'error';

              yield { type: 'tool_result', toolCall, toolResult, tier: selectedTier };

              // Add to tool results for continuation
              toolResults.push({
                type: 'tool-result',
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                output: { type: 'text', value: toolResult.output ?? toolResult.error ?? 'No output' },
              });
            }
            break;
          }

          case 'error': {
            // Log error but don't throw - let the stream continue if possible
            console.error('Stream error:', event.error);
            break;
          }

          case 'finish': {
            // Accumulate usage
            if (event.totalUsage) {
              totalUsage.promptTokens += event.totalUsage.inputTokens ?? 0;
              totalUsage.completionTokens += event.totalUsage.outputTokens ?? 0;
              totalUsage.totalTokens += event.totalUsage.totalTokens ?? 0;
            }

            // Check if we need to continue (tool calls were made)
            if (pendingToolCalls.size > 0 && toolResults.length > 0) {
              // Get the text and tool calls from this response
              const text = await result.text;
              const toolCallsFromResult = await result.toolCalls;

              // Add assistant message with tool calls
              modelMessages.push({
                role: 'assistant',
                content: [
                  ...(text ? [{ type: 'text' as const, text }] : []),
                  ...toolCallsFromResult.map(tc => ({
                    type: 'tool-call' as const,
                    toolCallId: tc.toolCallId,
                    toolName: tc.toolName,
                    input: tc.input,
                  })),
                ],
              });

              // Add tool results
              modelMessages.push({
                role: 'tool',
                content: toolResults,
              });

              continueLoop = true;
            } else {
              // No more tool calls, we're done
              yield {
                type: 'usage',
                tier: selectedTier,
                usage: totalUsage,
              };
              yield { type: 'done', tier: selectedTier };
            }
            break;
          }
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
