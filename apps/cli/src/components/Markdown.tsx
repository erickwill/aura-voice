import React from 'react';
import { Box, Text } from 'ink';
import { highlight } from 'cli-highlight';
import { colors } from '../styles/colors.js';

interface MarkdownProps {
  children: string;
}

interface ParsedBlock {
  type: 'text' | 'code' | 'heading' | 'list' | 'blockquote';
  content: string;
  language?: string;
  level?: number;
}

/**
 * Parse markdown into blocks for rendering
 */
function parseMarkdown(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const language = line.slice(3).trim() || 'plaintext';
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }

      blocks.push({
        type: 'code',
        content: codeLines.join('\n'),
        language,
      });
      i++; // Skip closing ```
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        content: headingMatch[2],
        level: headingMatch[1].length,
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [line.slice(2)];
      i++;

      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }

      blocks.push({
        type: 'blockquote',
        content: quoteLines.join('\n'),
      });
      continue;
    }

    // List item
    if (line.match(/^[\s]*[-*+]\s/) || line.match(/^[\s]*\d+\.\s/)) {
      const listLines: string[] = [line];
      i++;

      while (
        i < lines.length &&
        (lines[i].match(/^[\s]*[-*+]\s/) ||
          lines[i].match(/^[\s]*\d+\.\s/) ||
          (lines[i].startsWith('  ') && listLines.length > 0))
      ) {
        listLines.push(lines[i]);
        i++;
      }

      blocks.push({
        type: 'list',
        content: listLines.join('\n'),
      });
      continue;
    }

    // Regular text (collect consecutive non-empty lines)
    if (line.trim()) {
      const textLines: string[] = [line];
      i++;

      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].startsWith('```') &&
        !lines[i].match(/^#{1,6}\s/) &&
        !lines[i].startsWith('> ') &&
        !lines[i].match(/^[\s]*[-*+]\s/) &&
        !lines[i].match(/^[\s]*\d+\.\s/)
      ) {
        textLines.push(lines[i]);
        i++;
      }

      blocks.push({
        type: 'text',
        content: textLines.join('\n'),
      });
      continue;
    }

    // Empty line
    i++;
  }

  return blocks;
}

/**
 * Apply inline formatting (bold, italic, code, links)
 */
function formatInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    let match = remaining.match(/^(\*\*|__)(.+?)\1/);
    if (match) {
      parts.push(
        <Text key={key++} bold>
          {match[2]}
        </Text>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Italic: *text* or _text_
    match = remaining.match(/^(\*|_)(.+?)\1/);
    if (match) {
      parts.push(
        <Text key={key++} italic>
          {match[2]}
        </Text>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Inline code: `code`
    match = remaining.match(/^`([^`]+)`/);
    if (match) {
      parts.push(
        <Text key={key++} color={colors.syntax.string} backgroundColor="#1a1a2e">
          {match[1]}
        </Text>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Link: [text](url)
    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      parts.push(
        <Text key={key++} color={colors.semantic.info} underline>
          {match[1]}
        </Text>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Regular character
    const nextSpecial = remaining.search(/[\*_`\[]/);
    if (nextSpecial === -1) {
      parts.push(<Text key={key++}>{remaining}</Text>);
      break;
    } else if (nextSpecial === 0) {
      // Special char that didn't match any pattern, treat as regular
      parts.push(<Text key={key++}>{remaining[0]}</Text>);
      remaining = remaining.slice(1);
    } else {
      parts.push(<Text key={key++}>{remaining.slice(0, nextSpecial)}</Text>);
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts;
}

/**
 * Render a code block with syntax highlighting
 */
function CodeBlock({ content, language }: { content: string; language: string }) {
  let highlighted: string;

  try {
    highlighted = highlight(content, {
      language: language === 'plaintext' ? undefined : language,
      ignoreIllegals: true,
    });
  } catch {
    highlighted = content;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.ui.border}
      paddingX={1}
      marginY={1}
    >
      {language && language !== 'plaintext' && (
        <Box marginBottom={1}>
          <Text color={colors.ui.muted} dimColor>
            {language}
          </Text>
        </Box>
      )}
      <Text>{highlighted}</Text>
    </Box>
  );
}

/**
 * Render markdown content
 */
export function Markdown({ children }: MarkdownProps) {
  const blocks = parseMarkdown(children);

  return (
    <Box flexDirection="column">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'code':
            return (
              <CodeBlock
                key={index}
                content={block.content}
                language={block.language || 'plaintext'}
              />
            );

          case 'heading':
            return (
              <Box key={index} marginY={1}>
                <Text bold color={colors.brand.primary}>
                  {block.level === 1 ? '# ' : block.level === 2 ? '## ' : '### '}
                  {block.content}
                </Text>
              </Box>
            );

          case 'blockquote':
            return (
              <Box key={index} marginY={1} paddingLeft={1} borderStyle="single" borderLeft borderColor={colors.ui.muted}>
                <Text color={colors.ui.muted} italic>
                  {block.content}
                </Text>
              </Box>
            );

          case 'list':
            return (
              <Box key={index} flexDirection="column" marginY={1}>
                {block.content.split('\n').map((line, lineIndex) => (
                  <Text key={lineIndex}>{formatInline(line)}</Text>
                ))}
              </Box>
            );

          case 'text':
          default:
            return (
              <Box key={index} marginY={1}>
                <Text wrap="wrap">{formatInline(block.content)}</Text>
              </Box>
            );
        }
      })}
    </Box>
  );
}
