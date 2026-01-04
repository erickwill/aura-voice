import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';

export interface AIProviderConfig {
  apiKey: string;
  baseURL?: string;
  siteUrl?: string;
  siteName?: string;
}

let cachedProvider: ReturnType<typeof createOpenRouter> | null = null;
let cachedConfig: AIProviderConfig | null = null;

/**
 * Get or create the OpenRouter AI SDK provider
 */
export function getOpenRouterProvider(config: AIProviderConfig): ReturnType<typeof createOpenRouter> {
  // Return cached provider if config hasn't changed
  if (cachedProvider && cachedConfig &&
      cachedConfig.apiKey === config.apiKey &&
      cachedConfig.baseURL === config.baseURL) {
    return cachedProvider;
  }

  cachedProvider = createOpenRouter({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    headers: {
      'HTTP-Referer': config.siteUrl ?? 'https://10x.dev',
      'X-Title': config.siteName ?? '10x',
    },
  });

  cachedConfig = config;
  return cachedProvider;
}

/**
 * Get a language model from the provider
 */
export function getLanguageModel(config: AIProviderConfig, modelId: string): LanguageModel {
  const provider = getOpenRouterProvider(config);
  return provider(modelId);
}

/**
 * Clear the cached provider (useful for testing or config changes)
 */
export function clearProviderCache(): void {
  cachedProvider = null;
  cachedConfig = null;
}
