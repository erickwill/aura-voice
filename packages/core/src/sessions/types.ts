import type { Message, ModelTier } from '@10x/shared';

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

export interface SessionSummary {
  id: string;
  name?: string;
  messageCount: number;
  model: ModelTier;
  createdAt: Date;
  updatedAt: Date;
  state: Session['state'];
  lastUserPrompt?: string;
}

export interface CreateSessionOptions {
  name?: string;
  model?: ModelTier;
  workingDirectory?: string;
}
