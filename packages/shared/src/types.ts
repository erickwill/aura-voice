// Model tiers for routing
export type ModelTier = 'superfast' | 'fast' | 'smart';

// OpenRouter model IDs
export const MODEL_IDS = {
  superfast: 'groq/gpt-oss-20b-128k',
  fast: 'groq/kimi-k2-0905-1t-256k',
  smart: 'anthropic/claude-opus-4',
  imageGen: 'google/gemini-3-pro-image-preview',
  imageUnderstand: 'google/gemini-3-pro',
  videoGen: 'google/veo-3.1',
} as const;

// Message types
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: MessageRole;
  content: string;
  modelTier?: ModelTier;
  toolCalls?: ToolCall[];
  timestamp?: Date;
}

// Tool types
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: ToolResult;
  status: 'pending' | 'running' | 'success' | 'error';
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}

// Session types
export interface Session {
  id: string;
  name?: string;
  parentId?: string;
  messages: Message[];
  workingDirectory: string;
  model: ModelTier;
  createdAt: Date;
  updatedAt: Date;
  tokenUsage: {
    input: number;
    output: number;
  };
  state: 'active' | 'compacted' | 'archived';
}

// Config types
export interface Config {
  apiKey?: string;
  defaultModel: ModelTier;
  permissions: PermissionConfig;
}

export interface PermissionConfig {
  read: PermissionAction;
  write: PermissionAction;
  bash: BashPermissions;
}

export type PermissionAction = 'allow' | 'ask' | 'deny';

export interface BashPermissions {
  allow: string[];
  deny: string[];
}

// OpenRouter types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

export type ContentPart = TextPart | ImagePart;

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ImagePart {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  tools?: OpenRouterTool[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenRouterTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: ChatChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  finish_reason: 'stop' | 'tool_calls' | 'length';
}

// Streaming types
export interface StreamChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'tool_calls' | 'length' | null;
  }>;
}
