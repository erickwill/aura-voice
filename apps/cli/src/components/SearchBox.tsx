import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../styles/colors.js';

export interface SearchBoxProps<T> {
  /** Items to search through */
  items: T[];
  /** Function to extract searchable text from an item */
  getSearchText: (item: T) => string;
  /** Function to render an item in the list */
  renderItem: (item: T, isSelected: boolean, index: number) => React.ReactNode;
  /** Called when user selects an item */
  onSelect: (item: T) => void;
  /** Called when search box is dismissed (Escape) */
  onCancel?: () => void;
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Title to display above the search box */
  title?: string;
  /** Maximum number of items to display */
  maxVisible?: number;
  /** Whether the search box is active and receiving input */
  isActive?: boolean;
  /** Initial search query */
  initialQuery?: string;
  /** Called when query changes */
  onQueryChange?: (query: string) => void;
  /** Empty state message when no items match */
  emptyMessage?: string;
  /** Show index numbers next to items */
  showIndices?: boolean;
}

export function SearchBox<T>({
  items,
  getSearchText,
  renderItem,
  onSelect,
  onCancel,
  placeholder = 'Type to search...',
  title,
  maxVisible = 8,
  isActive = true,
  initialQuery = '',
  onQueryChange,
  emptyMessage = 'No matches found',
  showIndices = false,
}: SearchBoxProps<T>) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter items based on query
  const filteredItems = query.trim()
    ? items.filter((item) => {
        const text = getSearchText(item).toLowerCase();
        const queryLower = query.toLowerCase();
        // Support fuzzy matching - all query chars must appear in order
        let queryIndex = 0;
        for (const char of text) {
          if (char === queryLower[queryIndex]) {
            queryIndex++;
            if (queryIndex === queryLower.length) return true;
          }
        }
        return false;
      })
    : items;

  // Visible items (limited by maxVisible)
  const visibleItems = filteredItems.slice(0, maxVisible);

  // Reset selection when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Notify parent of query changes
  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  useInput(
    (input, key) => {
      // Navigation
      if (key.upArrow) {
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : visibleItems.length - 1
        );
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) =>
          prev < visibleItems.length - 1 ? prev + 1 : 0
        );
        return;
      }

      // Quick select with number keys (1-9)
      if (showIndices && input >= '1' && input <= '9') {
        const index = parseInt(input, 10) - 1;
        if (index < visibleItems.length) {
          onSelect(visibleItems[index]);
        }
        return;
      }

      // Select current item
      if (key.return) {
        const selected = visibleItems[selectedIndex];
        if (selected) {
          onSelect(selected);
        }
        return;
      }

      // Cancel
      if (key.escape) {
        onCancel?.();
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        setQuery((prev) => prev.slice(0, -1));
        return;
      }

      // Clear with Ctrl+U
      if (key.ctrl && input === 'u') {
        setQuery('');
        return;
      }

      // Regular character input
      if (input && !key.ctrl && !key.meta) {
        setQuery((prev) => prev + input);
      }
    },
    { isActive }
  );

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.brand.primary} padding={1}>
      {/* Title */}
      {title && (
        <Box marginBottom={1}>
          <Text color={colors.brand.primary} bold>
            {title}
          </Text>
        </Box>
      )}

      {/* Search input */}
      <Box marginBottom={1}>
        <Text color={colors.ui.muted}>{'> '}</Text>
        {query ? (
          <Text color={colors.ui.text}>{query}</Text>
        ) : (
          <Text color={colors.ui.muted}>{placeholder}</Text>
        )}
        <Text color={colors.brand.primary}>█</Text>
      </Box>

      {/* Results count */}
      <Box marginBottom={1}>
        <Text color={colors.ui.muted}>
          {filteredItems.length} of {items.length} items
          {filteredItems.length > maxVisible && ` (showing ${maxVisible})`}
        </Text>
      </Box>

      {/* Items list */}
      {visibleItems.length > 0 ? (
        <Box flexDirection="column">
          {visibleItems.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box key={index} gap={1}>
                {/* Selection indicator */}
                <Text color={isSelected ? colors.brand.primary : colors.ui.muted}>
                  {isSelected ? '>' : ' '}
                </Text>
                {/* Index number */}
                {showIndices && (
                  <Text color={colors.ui.muted} dimColor>
                    {index + 1}.
                  </Text>
                )}
                {/* Item content */}
                {renderItem(item, isSelected, index)}
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box>
          <Text color={colors.ui.muted}>{emptyMessage}</Text>
        </Box>
      )}

      {/* Help text */}
      <Box marginTop={1}>
        <Text color={colors.ui.muted} dimColor>
          ↑↓ navigate • Enter select • Esc cancel
          {showIndices && ' • 1-9 quick select'}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Hook to manage SearchBox state
 */
export function useSearchBox<T>() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  return {
    isOpen,
    query,
    open,
    close,
    setQuery,
  };
}
