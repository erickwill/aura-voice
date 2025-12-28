import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { colors } from '../styles/colors.js';
import type { ModelTier } from '@10x/shared';

interface StatusBarProps {
  modelTier: ModelTier;
  sessionName?: string;
  isStreaming: boolean;
  tokenUsage: { input: number; output: number };
  byok?: boolean;
}

const tierConfig: Record<ModelTier, { icon: string; color: string }> = {
  superfast: { icon: '⚡⚡', color: colors.tier.superfast },
  fast: { icon: '⚡', color: colors.tier.fast },
  smart: { icon: '◆', color: colors.tier.smart },
};

function formatTokens(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function StatusBar({
  modelTier,
  sessionName,
  isStreaming,
  tokenUsage,
  byok = false,
}: StatusBarProps) {
  const tier = tierConfig[modelTier];
  const totalTokens = tokenUsage.input + tokenUsage.output;

  return (
    <Box
      borderStyle="single"
      borderColor={colors.ui.border}
      paddingX={1}
      justifyContent="space-between"
    >
      <Box gap={1}>
        <Text color={colors.brand.primary} bold>
          10x
        </Text>
        <Text color={colors.ui.muted}>•</Text>
        {byok && (
          <>
            <Text color={colors.ui.textSecondary}>byok</Text>
            <Text color={colors.ui.muted}>•</Text>
          </>
        )}
        <Text color={tier.color}>
          {tier.icon} {modelTier}
        </Text>
        {isStreaming && (
          <>
            <Text color={colors.ui.muted}> </Text>
            <Text color={tier.color}>
              <Spinner type="dots" />
            </Text>
          </>
        )}
      </Box>

      <Box gap={1}>
        {sessionName && (
          <>
            <Text color={colors.ui.muted}>session:</Text>
            <Text color={colors.ui.text}>{sessionName}</Text>
            <Text color={colors.ui.muted}>•</Text>
          </>
        )}
        {totalTokens > 0 && (
          <Text color={colors.ui.muted}>{formatTokens(totalTokens)} tokens</Text>
        )}
      </Box>
    </Box>
  );
}
