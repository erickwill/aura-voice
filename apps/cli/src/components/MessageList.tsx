import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../styles/colors.js';
import { UserMessage } from './UserMessage.js';
import { AssistantMessage } from './AssistantMessage.js';
import type { Message } from '@10x/shared';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  return (
    <Box flexDirection="column" gap={1}>
      {messages.map((message, index) => {
        const isLast = index === messages.length - 1;
        const isStreamingThis = isStreaming && isLast && message.role === 'assistant';

        if (message.role === 'user') {
          return <UserMessage key={index} content={message.content} />;
        }

        if (message.role === 'assistant') {
          return (
            <AssistantMessage
              key={index}
              message={message}
              isStreaming={isStreamingThis}
            />
          );
        }

        if (message.role === 'system') {
          return (
            <Box key={index} paddingLeft={2} paddingY={1}>
              <Text color={colors.ui.muted}>{message.content}</Text>
            </Box>
          );
        }

        return null;
      })}
      {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
        <Box>
          <Text color={colors.ui.muted}>Thinking...</Text>
        </Box>
      )}
    </Box>
  );
}
