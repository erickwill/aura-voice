import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { colors } from '../styles/colors.js';
import type { ToolCall } from '@10x/shared';

interface ToolCallDisplayProps {
  toolCall: ToolCall;
}

const TOOL_ICONS: Record<string, string> = {
  read: '📄',
  write: '✏️',
  edit: '🔧',
  glob: '🔍',
  grep: '🔎',
  bash: '⚡',
};

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const icon = TOOL_ICONS[toolCall.name] ?? '🔧';
  const summary = getToolSummary(toolCall);

  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        <Text color={colors.ui.muted}>│ ┌─ </Text>
        <Text>{icon} </Text>
        <Text color={colors.ui.text} bold>
          {toolCall.name}
        </Text>
        <Text color={colors.ui.muted}>: {summary} </Text>
        <StatusIndicator status={toolCall.status} />
      </Box>

      {toolCall.status === 'success' && toolCall.output?.output && (
        <Box paddingLeft={4}>
          <Text color={colors.ui.muted}>│ └─ </Text>
          <Text color={colors.semantic.success}>
            {truncate(toolCall.output.output, 100)}
          </Text>
        </Box>
      )}

      {toolCall.status === 'error' && toolCall.output?.error && (
        <Box paddingLeft={4}>
          <Text color={colors.ui.muted}>│ └─ </Text>
          <Text color={colors.semantic.error}>
            {truncate(toolCall.output.error, 100)}
          </Text>
        </Box>
      )}
    </Box>
  );
}

function StatusIndicator({ status }: { status: ToolCall['status'] }) {
  switch (status) {
    case 'pending':
      return <Text color={colors.ui.muted}>○</Text>;
    case 'running':
      return (
        <Text color={colors.brand.primary}>
          <Spinner type="dots" />
        </Text>
      );
    case 'success':
      return <Text color={colors.semantic.success}>✓</Text>;
    case 'error':
      return <Text color={colors.semantic.error}>✗</Text>;
    default:
      return null;
  }
}

function getToolSummary(toolCall: ToolCall): string {
  const input = toolCall.input;

  switch (toolCall.name) {
    case 'read':
      return String(input.path ?? '');
    case 'write':
      return String(input.path ?? '');
    case 'edit':
      return String(input.path ?? '');
    case 'glob':
      return String(input.pattern ?? '');
    case 'grep':
      return String(input.pattern ?? '');
    case 'bash':
      return truncate(String(input.command ?? ''), 50);
    default:
      return JSON.stringify(input).slice(0, 50);
  }
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
