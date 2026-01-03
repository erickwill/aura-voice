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
 * Sleep for a given number of milliseconds, respecting abort signal
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
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
    let errorBody: { error?: { message?: string; type?: string; code?: string }; type?: string; code?: string } | undefined;

    try {
      errorBody = await response.json() as typeof errorBody;
      errorMessage = errorBody?.error?.message || `HTTP ${response.status}`;
    } catch {
      errorMessage = await response.text().catch(() => `HTTP ${response.status}`);
    }

    // Check for retry-after-ms header first (milliseconds - more precise)
    const retryAfterMsHeader = response.headers.get('retry-after-ms');
    if (retryAfterMsHeader) {
      const parsedMs = parseFloat(retryAfterMsHeader);
      if (!isNaN(parsedMs)) {
        retryAfterMs = parsedMs;
      }
    }

    // Then check for Retry-After header (seconds or HTTP date)
    if (retryAfterMs === undefined) {
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        // Try parsing as seconds
        const seconds = parseFloat(retryAfter);
        if (!isNaN(seconds)) {
          retryAfterMs = Math.ceil(seconds * 1000);
        } else {
          // Try parsing as HTTP date format
          const parsedDate = Date.parse(retryAfter);
          if (!isNaN(parsedDate)) {
            const delayMs = parsedDate - Date.now();
            if (delayMs > 0) {
              retryAfterMs = Math.ceil(delayMs);
            }
          }
        }
      }
    }

    // Rate limit specific message
    if (response.status === 429) {
      errorMessage = `Rate limited: ${errorMessage}`;
    }

    // Check for provider-specific retryable errors in error body
    const isRetryable = this.isProviderErrorRetryable(response.status, errorBody, errorMessage);

    const error = new OpenRouterError(errorMessage, response.status, retryAfterMs);
    // Override retryable status based on provider-specific detection
    if (isRetryable !== undefined) {
      error.isRetryable = isRetryable;
    }

    return error;
  }

  /**
   * Check if a provider error is retryable based on error body content
   */
  private isProviderErrorRetryable(
    status: number,
    errorBody: { error?: { message?: string; type?: string; code?: string }; type?: string; code?: string } | undefined,
    errorMessage: string
  ): boolean | undefined {
    // Default retryable logic is in OpenRouterError constructor (429, 5xx)
    // Here we check for specific provider error patterns

    const message = errorMessage.toLowerCase();
    const errorType = errorBody?.error?.type?.toLowerCase() || errorBody?.type?.toLowerCase() || '';
    const errorCode = errorBody?.error?.code?.toLowerCase() || errorBody?.code?.toLowerCase() || '';

    // Definitely retryable errors
    if (
      message.includes('overloaded') ||
      message.includes('too_many_requests') ||
      message.includes('rate_limit') ||
      message.includes('temporarily unavailable') ||
      message.includes('service unavailable') ||
      errorType === 'too_many_requests' ||
      errorType === 'server_error' ||
      errorCode.includes('rate_limit') ||
      errorCode.includes('exhausted') ||
      errorCode.includes('unavailable') ||
      message.includes('no_kv_space')
    ) {
      return true;
    }

    // Definitely not retryable errors
    if (
      status === 401 || // Unauthorized
      status === 402 || // Payment required
      status === 403 || // Forbidden
      errorType === 'invalid_request_error' ||
      errorType === 'authentication_error' ||
      message.includes('invalid api key') ||
      message.includes('invalid_api_key') ||
      message.includes('insufficient_quota') ||
      message.includes('billing')
    ) {
      return false;
    }

    // Return undefined to use default logic
    return undefined;
  }

  /**
   * Execute a fetch request with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    signal?: AbortSignal,
    attempt: number = 0
  ): Promise<Response> {
    // Check if already aborted
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      const response = await fetch(url, { ...options, signal });

      if (!response.ok) {
        const error = await this.parseErrorResponse(response);

        // If retryable and we have attempts left
        if (error.isRetryable && attempt < this.maxRetries) {
          const delayMs = error.retryAfterMs ?? getBackoffDelay(attempt, this.retryDelayMs);
          await sleep(delayMs, signal);
          return this.fetchWithRetry(url, options, signal, attempt + 1);
        }

        throw error;
      }

      return response;
    } catch (error) {
      // Re-throw abort errors immediately
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      // Network errors are retryable
      if (error instanceof TypeError && attempt < this.maxRetries) {
        const delayMs = getBackoffDelay(attempt, this.retryDelayMs);
        await sleep(delayMs, signal);
        return this.fetchWithRetry(url, options, signal, attempt + 1);
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
  async chat(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    const response = await this.fetchWithRetry(
      `${this.baseURL}/chat/completions`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...request,
          stream: false,
        }),
      },
      signal
    );

    return response.json() as Promise<ChatResponse>;
  }

  /**
   * Send a chat completion request with streaming
   */
  async *chatStream(
    request: ChatRequest,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // Check if already aborted
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

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
      },
      signal
    );

    const reader = response.body?.getReader();
    if (!reader) {
      throw new OpenRouterError('No response body', 0);
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        // Check for abort before each read
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

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
