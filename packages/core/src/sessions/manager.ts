import type { Session, SessionSummary, CreateSessionOptions } from './types.js';
import type { Message, ModelTier } from '@10x/shared';
import {
  generateSessionId,
  saveSession,
  getSession,
  getSessionByName,
  getLastSession,
  listSessions,
  deleteSession,
  renameSession,
} from './storage.js';

// Approximate tokens per character (conservative estimate)
const CHARS_PER_TOKEN = 4;

// Context window sizes for different models
const CONTEXT_WINDOWS: Record<ModelTier, number> = {
  superfast: 128000,
  fast: 256000,
  smart: 200000,
};

// Compaction threshold (80% of context)
const COMPACTION_THRESHOLD = 0.8;

export class SessionManager {
  private currentSession: Session | null = null;

  /**
   * Create a new session
   */
  create(options: CreateSessionOptions = {}): Session {
    const session: Session = {
      id: generateSessionId(),
      name: options.name,
      messages: [],
      workingDirectory: options.workingDirectory ?? process.cwd(),
      model: options.model ?? 'smart',
      createdAt: new Date(),
      updatedAt: new Date(),
      tokenUsage: { input: 0, output: 0 },
      state: 'active',
    };

    this.currentSession = session;
    saveSession(session);
    return session;
  }

  /**
   * Get the current session, or create one if none exists
   */
  getOrCreate(options: CreateSessionOptions = {}): Session {
    if (this.currentSession) {
      return this.currentSession;
    }

    return this.create(options);
  }

  /**
   * Get the current session
   */
  getCurrent(): Session | null {
    return this.currentSession;
  }

  /**
   * Set the current session
   */
  setCurrent(session: Session): void {
    this.currentSession = session;
  }

  /**
   * Load a session by ID
   */
  load(id: string): Session | null {
    const session = getSession(id);
    if (session) {
      this.currentSession = session;
    }
    return session;
  }

  /**
   * Load a session by name
   */
  loadByName(name: string): Session | null {
    const session = getSessionByName(name);
    if (session) {
      this.currentSession = session;
    }
    return session;
  }

  /**
   * Resume the last session
   */
  resumeLast(): Session | null {
    const session = getLastSession();
    if (session) {
      this.currentSession = session;
    }
    return session;
  }

  /**
   * Add a message to the current session
   */
  addMessage(message: Message): void {
    if (!this.currentSession) {
      this.create();
    }

    this.currentSession!.messages.push(message);
    this.currentSession!.updatedAt = new Date();

    // Update token usage estimate
    const tokens = this.estimateTokens(message.content);
    if (message.role === 'user') {
      this.currentSession!.tokenUsage.input += tokens;
    } else {
      this.currentSession!.tokenUsage.output += tokens;
    }

    saveSession(this.currentSession!);
  }

  /**
   * Save the current session
   */
  save(): void {
    if (this.currentSession) {
      this.currentSession.updatedAt = new Date();
      saveSession(this.currentSession);
    }
  }

  /**
   * Rename the current session
   */
  rename(name: string): boolean {
    if (!this.currentSession) return false;

    this.currentSession.name = name;
    this.currentSession.updatedAt = new Date();
    saveSession(this.currentSession);
    return true;
  }

  /**
   * List recent sessions
   */
  list(limit = 20): SessionSummary[] {
    return listSessions(limit);
  }

  /**
   * Delete a session
   */
  delete(id: string): boolean {
    if (this.currentSession?.id === id) {
      this.currentSession = null;
    }
    return deleteSession(id);
  }

  /**
   * Fork the current session (create a copy)
   */
  fork(name?: string): Session | null {
    if (!this.currentSession) return null;

    const forked: Session = {
      id: generateSessionId(),
      name: name ?? `${this.currentSession.name ?? 'session'}-fork`,
      parentId: this.currentSession.id,
      messages: [...this.currentSession.messages],
      workingDirectory: this.currentSession.workingDirectory,
      model: this.currentSession.model,
      createdAt: new Date(),
      updatedAt: new Date(),
      tokenUsage: { ...this.currentSession.tokenUsage },
      state: 'active',
    };

    saveSession(forked);
    this.currentSession = forked;
    return forked;
  }

  /**
   * Clear messages in current session
   */
  clear(): void {
    if (this.currentSession) {
      this.currentSession.messages = [];
      this.currentSession.tokenUsage = { input: 0, output: 0 };
      this.currentSession.updatedAt = new Date();
      saveSession(this.currentSession);
    }
  }

  /**
   * Check if compaction is needed
   */
  needsCompaction(): boolean {
    if (!this.currentSession) return false;

    const contextWindow = CONTEXT_WINDOWS[this.currentSession.model];
    const threshold = contextWindow * COMPACTION_THRESHOLD;
    const currentTokens =
      this.currentSession.tokenUsage.input +
      this.currentSession.tokenUsage.output;

    return currentTokens > threshold;
  }

  /**
   * Get estimated token count
   */
  getTokenCount(): number {
    if (!this.currentSession) return 0;
    return (
      this.currentSession.tokenUsage.input +
      this.currentSession.tokenUsage.output
    );
  }

  /**
   * Get context window size for current model
   */
  getContextWindow(): number {
    if (!this.currentSession) return CONTEXT_WINDOWS.smart;
    return CONTEXT_WINDOWS[this.currentSession.model];
  }

  /**
   * Estimate tokens for a string
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Compact the session by summarizing old messages
   * Returns the summary that was generated
   */
  async compact(summarizer: (messages: Message[]) => Promise<string>): Promise<string | null> {
    if (!this.currentSession || this.currentSession.messages.length < 4) {
      return null;
    }

    // Keep the last 2 exchanges (4 messages)
    const keepCount = 4;
    const toSummarize = this.currentSession.messages.slice(0, -keepCount);
    const toKeep = this.currentSession.messages.slice(-keepCount);

    if (toSummarize.length === 0) return null;

    // Generate summary
    const summary = await summarizer(toSummarize);

    // Create new message list with summary
    const summaryMessage: Message = {
      role: 'system',
      content: `[Session Summary]\n${summary}`,
    };

    this.currentSession.messages = [summaryMessage, ...toKeep];
    this.currentSession.state = 'compacted';
    this.currentSession.updatedAt = new Date();

    // Recalculate token usage
    const totalContent = this.currentSession.messages
      .map((m) => m.content)
      .join('');
    const estimatedTokens = this.estimateTokens(totalContent);
    this.currentSession.tokenUsage = {
      input: Math.floor(estimatedTokens * 0.6),
      output: Math.floor(estimatedTokens * 0.4),
    };

    saveSession(this.currentSession);
    return summary;
  }
}
