import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../styles/colors.js';

interface PermissionPromptProps {
  tool: string;
  input: string;
  context?: string;
  onResponse: (allowed: boolean) => void;
}

export function PermissionPrompt({
  tool,
  input,
  context,
  onResponse,
}: PermissionPromptProps) {
  const [submitted, setSubmitted] = useState(false);

  useInput(
    (char, key) => {
      if (submitted) return;

      const lower = char.toLowerCase();
      if (lower === 'y') {
        setSubmitted(true);
        onResponse(true);
      } else if (lower === 'n' || key.escape) {
        setSubmitted(true);
        onResponse(false);
      }
    },
    { isActive: !submitted }
  );

  // Get tool icon
  const getToolIcon = (tool: string): string => {
    switch (tool) {
      case 'bash':
        return '$';
      case 'write':
        return '+';
      case 'edit':
        return '~';
      case 'read':
        return '#';
      default:
        return '?';
    }
  };

  // Get tool color
  const getToolColor = (tool: string): string => {
    switch (tool) {
      case 'bash':
        return colors.semantic.warning;
      case 'write':
        return colors.semantic.success;
      case 'edit':
        return colors.semantic.info;
      default:
        return colors.ui.muted;
    }
  };

  // Truncate long inputs
  const displayInput =
    input.length > 80 ? input.slice(0, 77) + '...' : input;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.semantic.warning}
      paddingX={1}
      marginY={1}
    >
      <Box>
        <Text color={colors.semantic.warning} bold>
          Permission Required
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color={getToolColor(tool)}>
          {getToolIcon(tool)}{' '}
        </Text>
        <Text bold color={colors.ui.text}>
          {tool}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={colors.ui.muted} wrap="wrap">
          {displayInput}
        </Text>
      </Box>

      {context && (
        <Box marginTop={1}>
          <Text color={colors.ui.muted} dimColor>
            {context}
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text>
          <Text color={colors.semantic.success} bold>
            [Y]
          </Text>
          <Text color={colors.ui.muted}> Allow </Text>
          <Text color={colors.semantic.error} bold>
            [N]
          </Text>
          <Text color={colors.ui.muted}> Deny </Text>
        </Text>
      </Box>
    </Box>
  );
}
