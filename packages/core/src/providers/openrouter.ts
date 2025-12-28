import type {
  ChatRequest,
  ChatResponse,
  StreamChunk,
} from '@10x/shared';

export interface OpenRouterClientConfig {
  apiKey: string;
  baseURL?: string;
  siteUrl?: string;
  siteName?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Error class for OpenRouter API errors
 */
export class OpenRouterError extends Error {
  public status: number;
  public isRetryable: boolean;
  public retryAfterMs?: number;

  constructor(message: string, status: number, retryAfterMs?: number) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    // Retryable: rate limits (429), server errors (5xx), network issues
    this.isRetryable = status === 429 || status >= 500;
  }
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number, baseDelayMs: number): number {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
}

export class OpenRouterClient {
  private apiKey: string;
  private baseURL: string;
  private siteUrl: string;
  private siteName: string;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(config: OpenRouterClientConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL ?? 'https://openrouter.ai/api/v1';
    this.siteUrl = config.siteUrl ?? 'https://10x.dev';
    this.siteName = config.siteName ?? '10x';
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelayMs = config.retryDelayMs ?? 1000;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.siteUrl,
      'X-Title': this.siteName,
    };
  }

  /**
   * Parse error response and extract rate limit info
   */
  private async parseErrorResponse(response: Response): Promise<OpenRouterError> {
    let errorMessage: string;
    let retryAfterMs: number | undefined;

    try {
      const errorBody = await response.json() as { error?: { message?: string } };
      errorMessage = errorBody.error?.message || `HTTP ${response.status}`;
    } catch {
      errorMessage = await response.text().catch(() => `HTTP ${response.status}`);
    }

    // Check for Retry-After header (in seconds)
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        retryAfterMs = seconds * 1000;
      }
    }

    // Rate limit specific message
    if (response.status === 429) {
      errorMessage = `Rate limited: ${errorMessage}`;
    }

    return new OpenRouterError(errorMessage, response.status, retryAfterMs);
  }

  /**
   * Execute a fetch request with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt: number = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await this.parseErrorResponse(response);

        // If retryable and we have attempts left
        if (error.isRetryable && attempt < this.maxRetries) {
          const delayMs = error.retryAfterMs ?? getBackoffDelay(attempt, this.retryDelayMs);
          await sleep(delayMs);
          return this.fetchWithRetry(url, options, attempt + 1);
        }

        throw error;
      }

      return response;
    } catch (error) {
      // Network errors are retryable
      if (error instanceof TypeError && attempt < this.maxRetries) {
        const delayMs = getBackoffDelay(attempt, this.retryDelayMs);
        await sleep(delayMs);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      // Re-throw OpenRouterError as-is
      if (error instanceof OpenRouterError) {
        throw error;
      }

      // Wrap other errors
      throw new OpenRouterError(
        error instanceof Error ? error.message : 'Unknown error',
        0
      );
    }
  }

  /**
   * Send a chat completion request (non-streaming)
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.fetchWithRetry(
      `${this.baseURL}/chat/completions`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...request,
          stream: false,
        }),
      }
    );

    return response.json() as Promise<ChatResponse>;
  }

  /**
   * Send a chat completion request with streaming
   */
  async *chatStream(
    request: ChatRequest
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // For streaming, we only retry on initial connection failure
    const response = await this.fetchWithRetry(
      `${this.baseURL}/chat/completions`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
      }
    );

    const reader = response.body?.getReader();
    if (!reader) {
      throw new OpenRouterError('No response body', 0);
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const chunk: StreamChunk = JSON.parse(data);
            yield chunk;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check available models
   */
  async getModels(): Promise<{ id: string; name: string }[]> {
    const response = await this.fetchWithRetry(
      `${this.baseURL}/models`,
      { headers: this.getHeaders() }
    );

    const data = (await response.json()) as { data?: { id: string; name: string }[] };
    return data.data ?? [];
  }
}
