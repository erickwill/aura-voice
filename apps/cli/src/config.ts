import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { ModelTier } from '@10x/shared';

export type AuthMode = 'byok' | '10x';

export interface AppConfig {
  apiKey?: string;          // OpenRouter API key (BYOK mode)
  authToken?: string;       // 10x API token (10x auth mode)
  authMode?: AuthMode;      // Which auth mode is active
  defaultModel: ModelTier;
  lastSessionId?: string;
}

const CONFIG_DIR = join(homedir(), '.config', '10x');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: AppConfig = {
  defaultModel: 'smart',
};

/**
 * Ensure the config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load the config file
 */
export function loadConfig(): AppConfig {
  ensureConfigDir();

  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save the config file
 */
export function saveConfig(config: AppConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Get the API key from config (BYOK mode)
 */
export function getApiKey(): string | null {
  const config = loadConfig();
  return config.apiKey ?? null;
}

/**
 * Save the API key to config (BYOK mode)
 */
export function saveApiKey(apiKey: string): void {
  const config = loadConfig();
  config.apiKey = apiKey;
  config.authMode = 'byok';
  saveConfig(config);
}

/**
 * Check if API key is configured
 */
export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

/**
 * Clear the API key
 */
export function clearApiKey(): void {
  const config = loadConfig();
  delete config.apiKey;
  if (config.authMode === 'byok') {
    delete config.authMode;
  }
  saveConfig(config);
}

/**
 * Get the 10x auth token from config
 */
export function getAuthToken(): string | null {
  const config = loadConfig();
  return config.authToken ?? null;
}

/**
 * Save the 10x auth token to config
 */
export function saveAuthToken(token: string): void {
  const config = loadConfig();
  config.authToken = token;
  config.authMode = '10x';
  saveConfig(config);
}

/**
 * Check if 10x auth token is configured
 */
export function hasAuthToken(): boolean {
  return getAuthToken() !== null;
}

/**
 * Clear the 10x auth token
 */
export function clearAuthToken(): void {
  const config = loadConfig();
  delete config.authToken;
  if (config.authMode === '10x') {
    delete config.authMode;
  }
  saveConfig(config);
}

/**
 * Get the current auth mode
 */
export function getAuthMode(): AuthMode | null {
  const config = loadConfig();
  return config.authMode ?? null;
}

/**
 * Check if user is authenticated (either mode)
 */
export function isAuthenticated(): boolean {
  const mode = getAuthMode();
  if (mode === 'byok') {
    return hasApiKey();
  }
  if (mode === '10x') {
    return hasAuthToken();
  }
  return false;
}

/**
 * Clear all auth data
 */
export function clearAuth(): void {
  const config = loadConfig();
  delete config.apiKey;
  delete config.authToken;
  delete config.authMode;
  saveConfig(config);
}

/**
 * Get config directory path
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}
