import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../styles/colors.js';
import { Markdown } from './Markdown.js';
import { ToolCallDisplay } from './ToolCallDisplay.js';
import type { Message } from '@10x/shared';

interface AssistantMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function AssistantMessage({ message, isStreaming = false }: AssistantMessageProps) {
  const modelLabel = message.modelTier
    ? message.modelTier === 'superfast'
      ? 'superfast'
      : message.modelTier === 'fast'
        ? 'fast'
        : 'smart'
    : '10x';

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text color={colors.brand.primary} bold>
          {modelLabel}
        </Text>
        {isStreaming && (
          <Text color={colors.ui.muted}> typing...</Text>
        )}
      </Box>

      {/* Tool calls */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {message.toolCalls.map((toolCall) => (
            <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
          ))}
        </Box>
      )}

      {/* Message content */}
      {message.content && (
        <Box paddingLeft={2}>
          <Markdown>{message.content}</Markdown>
        </Box>
      )}
    </Box>
  );
}
