import { useTheme } from "../context"

interface FileLinkProps {
  path: string
  line?: number
  column?: number
}

/**
 * Clickable file path link that opens in the default editor
 * Uses OSC 8 hyperlink escape sequences supported by modern terminals
 */
export function FileLink(props: FileLinkProps) {
  const { theme } = useTheme()

  // Build file:// URL with optional line/column
  const href = () => {
    let url = `file://${props.path}`
    if (props.line !== undefined) {
      url += `:${props.line}`
      if (props.column !== undefined) {
        url += `:${props.column}`
      }
    }
    return url
  }

  // Display just the filename for short display, full path on hover
  const displayName = () => {
    const parts = props.path.split("/")
    const filename = parts[parts.length - 1]
    if (props.line !== undefined) {
      return `${filename}:${props.line}`
    }
    return filename
  }

  return (
    <a href={href()}>
      <text fg={theme.info} underline>
        {displayName()}
      </text>
    </a>
  )
}

/**
 * Parse text and replace file paths with clickable links
 * Detects patterns like:
 * - /absolute/path/to/file.ts
 * - /path/to/file.ts:123
 * - /path/to/file.ts:123:45
 */
export function parseFilePaths(text: string): Array<{ type: "text" | "file"; content: string; path?: string; line?: number; column?: number }> {
  const parts: Array<{ type: "text" | "file"; content: string; path?: string; line?: number; column?: number }> = []

  // Regex to match file paths with optional line:column
  const filePathRegex = /(\/[^\s:]+(?:\.[a-zA-Z0-9]+))(?::(\d+))?(?::(\d+))?/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = filePathRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      })
    }

    // Add the file path
    const [fullMatch, path, lineStr, columnStr] = match
    parts.push({
      type: "file",
      content: fullMatch,
      path,
      line: lineStr ? parseInt(lineStr, 10) : undefined,
      column: columnStr ? parseInt(columnStr, 10) : undefined,
    })

    lastIndex = match.index + fullMatch.length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    })
  }

  return parts
}

/**
 * Render text with file paths converted to clickable links
 */
export function TextWithFileLinks(props: { children: string }) {
  const { theme } = useTheme()
  const parts = () => parseFilePaths(props.children)

  return (
    <text>
      {parts().map((part) => {
        if (part.type === "file" && part.path) {
          return (
            <a href={`file://${part.path}${part.line ? `:${part.line}` : ""}${part.column ? `:${part.column}` : ""}`}>
              <text fg={theme.info} underline>
                {part.content}
              </text>
            </a>
          )
        }
        return <text>{part.content}</text>
      })}
    </text>
  )
}
