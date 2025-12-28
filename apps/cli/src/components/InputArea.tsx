import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../styles/colors.js';

const MAX_HISTORY = 100;

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputArea({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Type your message...',
}: InputAreaProps) {
  // Command history
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const savedInputRef = useRef<string>('');

  useInput(
    (input, key) => {
      if (disabled) return;

      // Submit on Enter
      if (key.return) {
        if (value.trim()) {
          // Add to history if not duplicate of last entry
          setHistory((prev) => {
            const newHistory = prev[prev.length - 1] === value.trim()
              ? prev
              : [...prev.slice(-(MAX_HISTORY - 1)), value.trim()];
            return newHistory;
          });
          setHistoryIndex(-1);
          savedInputRef.current = '';
        }
        onSubmit(value);
        return;
      }

      // Navigate history with up/down arrows
      if (key.upArrow) {
        if (history.length === 0) return;

        if (historyIndex === -1) {
          // Save current input before navigating
          savedInputRef.current = value;
        }

        const newIndex = historyIndex === -1
          ? history.length - 1
          : Math.max(0, historyIndex - 1);

        setHistoryIndex(newIndex);
        onChange(history[newIndex] || '');
        return;
      }

      if (key.downArrow) {
        if (historyIndex === -1) return;

        const newIndex = historyIndex + 1;

        if (newIndex >= history.length) {
          // Back to current input
          setHistoryIndex(-1);
          onChange(savedInputRef.current);
        } else {
          setHistoryIndex(newIndex);
          onChange(history[newIndex] || '');
        }
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        setHistoryIndex(-1);
        onChange(value.slice(0, -1));
        return;
      }

      // Clear line with Ctrl+U
      if (key.ctrl && input === 'u') {
        setHistoryIndex(-1);
        onChange('');
        return;
      }

      // Regular character input
      if (input && !key.ctrl && !key.meta) {
        setHistoryIndex(-1);
        onChange(value + input);
      }
    },
    { isActive: !disabled }
  );

  // Reset history index when value is externally cleared
  useEffect(() => {
    if (value === '' && historyIndex !== -1) {
      setHistoryIndex(-1);
    }
  }, [value]);

  return (
    <Box
      borderStyle="single"
      borderColor={colors.ui.border}
      borderTop={true}
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
      paddingY={0}
    >
      <Text color={colors.brand.primary} bold>
        {'> '}
      </Text>
      {value ? (
        <Text color={colors.ui.text}>{value}</Text>
      ) : (
        <Text color={colors.ui.muted}>{disabled ? 'Waiting...' : placeholder}</Text>
      )}
      {!disabled && <Text color={colors.brand.primary}>█</Text>}
    </Box>
  );
}
