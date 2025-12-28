import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { colors } from '../styles/colors.js';
import { OpenRouterClient } from '@10x/core';

interface ApiKeyPromptProps {
  onSubmit: (apiKey: string) => void;
  onCancel: () => void;
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

/**
 * Validate OpenRouter API key format
 */
function isValidKeyFormat(key: string): boolean {
  // OpenRouter keys typically start with sk-or-
  // Allow some flexibility for different key formats
  return key.length >= 20 && (key.startsWith('sk-or-') || key.startsWith('sk-'));
}

/**
 * Test the API key by making a simple request
 */
async function testApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const client = new OpenRouterClient({ apiKey });

    // Make a minimal request to test the key
    const response = await client.chat({
      messages: [{ role: 'user', content: 'test' }],
      model: 'openai/gpt-3.5-turbo',
      max_tokens: 1,
    });

    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('401') || message.includes('Unauthorized') || message.includes('Invalid')) {
      return { valid: false, error: 'Invalid API key' };
    }
    if (message.includes('402') || message.includes('insufficient')) {
      // Key is valid but no credits - that's fine for validation
      return { valid: true };
    }
    if (message.includes('429') || message.includes('rate')) {
      // Rate limited but key is valid
      return { valid: true };
    }

    return { valid: false, error: message };
  }
}

export function ApiKeyPrompt({ onSubmit, onCancel }: ApiKeyPromptProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) return;

    // Format validation
    if (!isValidKeyFormat(trimmedKey)) {
      setErrorMessage('Invalid key format. OpenRouter keys start with sk-or-');
      setValidationState('invalid');
      return;
    }

    // Test connection
    setValidationState('validating');
    setErrorMessage(null);

    const result = await testApiKey(trimmedKey);

    if (result.valid) {
      setValidationState('valid');
      // Brief delay to show success state
      setTimeout(() => {
        onSubmit(trimmedKey);
      }, 500);
    } else {
      setValidationState('invalid');
      setErrorMessage(result.error || 'Failed to validate API key');
    }
  };

  useInput((input, key) => {
    // Ignore input while validating
    if (validationState === 'validating') return;

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      handleSubmit();
      return;
    }

    if (key.backspace || key.delete) {
      setApiKey((prev) => prev.slice(0, -1));
      setValidationState('idle');
      setErrorMessage(null);
      return;
    }

    // Toggle visibility with Ctrl+V
    if (key.ctrl && input === 'v') {
      setShowKey((prev) => !prev);
      return;
    }

    // Regular character input
    if (input && !key.ctrl && !key.meta) {
      setApiKey((prev) => prev + input);
      setValidationState('idle');
      setErrorMessage(null);
    }
  });

  const maskedKey = showKey
    ? apiKey
    : apiKey.replace(/./g, '•');

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="column" marginBottom={1}>
        <Text color={colors.brand.primary} bold>
          OpenRouter API Key Required
        </Text>
        <Text color={colors.ui.muted}>
          Get your API key from https://openrouter.ai/keys
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={colors.ui.text}>API Key: </Text>
        {apiKey ? (
          <Text color={colors.ui.text}>{maskedKey}</Text>
        ) : (
          <Text color={colors.ui.muted}>sk-or-...</Text>
        )}
        {validationState !== 'validating' && (
          <Text color={colors.brand.primary}>█</Text>
        )}
      </Box>

      {/* Validation status */}
      {validationState === 'validating' && (
        <Box marginBottom={1}>
          <Text color={colors.semantic.info}>
            <Spinner type="dots" /> Testing connection...
          </Text>
        </Box>
      )}

      {validationState === 'valid' && (
        <Box marginBottom={1}>
          <Text color={colors.semantic.success}>✓ API key validated successfully!</Text>
        </Box>
      )}

      {validationState === 'invalid' && errorMessage && (
        <Box marginBottom={1}>
          <Text color={colors.semantic.error}>✗ {errorMessage}</Text>
        </Box>
      )}

      <Box flexDirection="column">
        <Text color={colors.ui.muted} dimColor>
          Press Enter to validate & save • Escape to cancel • Ctrl+V to toggle visibility
        </Text>
      </Box>
    </Box>
  );
}
