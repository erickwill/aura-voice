import { For, Switch, Match, createMemo } from "solid-js"
import type { JSX } from "solid-js"
import { useTheme } from "../context"
import { CodeBlock } from "./CodeBlock"

interface MarkdownProps {
  children: string
}

interface ParsedBlock {
  type: "text" | "code" | "heading" | "list" | "blockquote"
  content: string
  language?: string
  level?: number
}

function parseMarkdown(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = []
  const lines = text.split("\n")
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith("```")) {
      const language = line.slice(3).trim() || "plaintext"
      const codeLines: string[] = []
      i++

      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }

      blocks.push({
        type: "code",
        content: codeLines.join("\n"),
        language,
      })
      i++ // Skip closing ```
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: "heading",
        content: headingMatch[2],
        level: headingMatch[1].length,
      })
      i++
      continue
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [line.slice(2)]
      i++

      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2))
        i++
      }

      blocks.push({
        type: "blockquote",
        content: quoteLines.join("\n"),
      })
      continue
    }

    // List item
    if (line.match(/^[\s]*[-*+]\s/) || line.match(/^[\s]*\d+\.\s/)) {
      const listLines: string[] = [line]
      i++

      while (
        i < lines.length &&
        (lines[i].match(/^[\s]*[-*+]\s/) ||
          lines[i].match(/^[\s]*\d+\.\s/) ||
          (lines[i].startsWith("  ") && listLines.length > 0))
      ) {
        listLines.push(lines[i])
        i++
      }

      blocks.push({
        type: "list",
        content: listLines.join("\n"),
      })
      continue
    }

    // Regular text
    if (line.trim()) {
      const textLines: string[] = [line]
      i++

      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].startsWith("```") &&
        !lines[i].match(/^#{1,6}\s/) &&
        !lines[i].startsWith("> ") &&
        !lines[i].match(/^[\s]*[-*+]\s/) &&
        !lines[i].match(/^[\s]*\d+\.\s/)
      ) {
        textLines.push(lines[i])
        i++
      }

      blocks.push({
        type: "text",
        content: textLines.join("\n"),
      })
      continue
    }

    // Empty line
    i++
  }

  return blocks
}

interface FormattedPart {
  type: "text" | "bold" | "italic" | "code" | "link"
  content: string
}

function formatInline(text: string): FormattedPart[] {
  const parts: FormattedPart[] = []
  let remaining = text

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    let match = remaining.match(/^(\*\*|__)(.+?)\1/)
    if (match) {
      parts.push({ type: "bold", content: match[2] })
      remaining = remaining.slice(match[0].length)
      continue
    }

    // Italic: *text* or _text_
    match = remaining.match(/^(\*|_)(.+?)\1/)
    if (match) {
      parts.push({ type: "italic", content: match[2] })
      remaining = remaining.slice(match[0].length)
      continue
    }

    // Inline code: `code`
    match = remaining.match(/^`([^`]+)`/)
    if (match) {
      parts.push({ type: "code", content: match[1] })
      remaining = remaining.slice(match[0].length)
      continue
    }

    // Link: [text](url)
    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (match) {
      parts.push({ type: "link", content: match[1] })
      remaining = remaining.slice(match[0].length)
      continue
    }

    // Regular character
    const nextSpecial = remaining.search(/[\*_`\[]/)
    if (nextSpecial === -1) {
      parts.push({ type: "text", content: remaining })
      break
    } else if (nextSpecial === 0) {
      parts.push({ type: "text", content: remaining[0] })
      remaining = remaining.slice(1)
    } else {
      parts.push({ type: "text", content: remaining.slice(0, nextSpecial) })
      remaining = remaining.slice(nextSpecial)
    }
  }

  return parts
}

function InlineText(props: { content: string }) {
  return (
    <box flexDirection="column" width="100%">
      <text>{String(props.content || "")}</text>
    </box>
  )
}

// Local code block renderer - uses the syntax-highlighted CodeBlock component
function MarkdownCodeBlock(props: { content: string; language: string }) {
  return <CodeBlock code={props.content} language={props.language} maxHeight={30} />
}

export function Markdown(props: MarkdownProps) {
  const { theme } = useTheme()
  const blocks = createMemo(() => parseMarkdown(String(props.children || "")))

  return (
    <box flexDirection="column" width="100%">
      <For each={blocks()}>
        {(block) => (
          <Switch>
            <Match when={block.type === "code"}>
              <MarkdownCodeBlock content={String(block.content || "")} language={block.language || "plaintext"} />
            </Match>

            <Match when={block.type === "heading"}>
              <text bold fg={theme.primary}>
                {`${block.level === 1 ? "# " : block.level === 2 ? "## " : "### "}${String(block.content || "")}`}
              </text>
            </Match>

            <Match when={block.type === "blockquote"}>
              <box paddingLeft={1} border={["left"]} borderColor={theme.textMuted}>
                <text fg={theme.textMuted} italic>
                  {String(block.content || "")}
                </text>
              </box>
            </Match>

            <Match when={block.type === "list"}>
              <box flexDirection="column" width="100%">
                <For each={String(block.content || "").split("\n")}>
                  {(line) => <InlineText content={String(line || "")} />}
                </For>
              </box>
            </Match>

            <Match when={block.type === "text"}>
              <InlineText content={String(block.content || "")} />
            </Match>
          </Switch>
        )}
      </For>
    </box>
  )
}
