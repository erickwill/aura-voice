import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { ModelTier } from '@10x/shared';

export interface AppConfig {
  apiKey?: string;
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
 * Get the API key from environment or config
 * Priority: OPENROUTER_API_KEY env var > config file
 */
export function getApiKey(): string | null {
  // Check environment variable first
  const envKey = process.env.OPENROUTER_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Fall back to config file
  const config = loadConfig();
  return config.apiKey ?? null;
}

/**
 * Save the API key to config
 */
export function saveApiKey(apiKey: string): void {
  const config = loadConfig();
  config.apiKey = apiKey;
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
  saveConfig(config);
}

/**
 * Get config directory path
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}
