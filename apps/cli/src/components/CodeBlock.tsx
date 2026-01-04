import { createMemo, Show } from "solid-js"
import { SyntaxStyle } from "@opentui/core"
import { useTheme } from "../context"

interface CodeBlockProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  maxHeight?: number
}

// GitHub Dark syntax highlighting
const syntaxStyles = {
  keyword: { fg: { r: 255, g: 123, b: 114, a: 255 }, bold: true },
  "keyword.import": { fg: { r: 255, g: 123, b: 114, a: 255 }, bold: true },
  string: { fg: { r: 165, g: 214, b: 255, a: 255 } },
  comment: { fg: { r: 139, g: 148, b: 158, a: 255 }, italic: true },
  number: { fg: { r: 121, g: 192, b: 255, a: 255 } },
  boolean: { fg: { r: 121, g: 192, b: 255, a: 255 } },
  constant: { fg: { r: 121, g: 192, b: 255, a: 255 } },
  function: { fg: { r: 210, g: 168, b: 255, a: 255 } },
  "function.call": { fg: { r: 210, g: 168, b: 255, a: 255 } },
  constructor: { fg: { r: 255, g: 166, b: 87, a: 255 } },
  type: { fg: { r: 255, g: 166, b: 87, a: 255 } },
  operator: { fg: { r: 255, g: 123, b: 114, a: 255 } },
  variable: { fg: { r: 230, g: 237, b: 243, a: 255 } },
  property: { fg: { r: 121, g: 192, b: 255, a: 255 } },
  bracket: { fg: { r: 240, g: 246, b: 252, a: 255 } },
  punctuation: { fg: { r: 240, g: 246, b: 252, a: 255 } },
  // Markdown styles
  "markup.heading": { fg: { r: 88, g: 166, b: 255, a: 255 }, bold: true },
  "markup.bold": { fg: { r: 240, g: 246, b: 252, a: 255 }, bold: true },
  "markup.italic": { fg: { r: 240, g: 246, b: 252, a: 255 }, italic: true },
  "markup.raw": { fg: { r: 165, g: 214, b: 255, a: 255 }, bg: { r: 22, g: 27, b: 34, a: 255 } },
  "markup.link": { fg: { r: 88, g: 166, b: 255, a: 255 }, underline: true },
  default: { fg: { r: 230, g: 237, b: 243, a: 255 } },
}

export function CodeBlock(props: CodeBlockProps) {
  const { theme } = useTheme()
  const syntaxStyle = createMemo(() => SyntaxStyle.fromStyles(syntaxStyles))
  const filetype = createMemo(() => mapLanguage(props.language))

  return (
    <box
      flexDirection="column"
      backgroundColor="#161b22"
      border={["all"]}
      borderColor={theme.border}
      marginTop={1}
      marginBottom={1}
    >
      <Show when={props.language && props.language !== "plaintext"}>
        <box paddingLeft={1} marginBottom={1}>
          <text fg={theme.textMuted}>{String(props.language || "")}</text>
        </box>
      </Show>
      <scrollbox
        maxHeight={props.maxHeight ?? 20}
        scrollY={true}
        scrollX={false}
      >
        <code
          content={props.code}
          filetype={filetype()}
          syntaxStyle={syntaxStyle()}
          selectable={true}
          selectionBg="#264F78"
          selectionFg="#FFFFFF"
          width="100%"
        />
      </scrollbox>
    </box>
  )
}

// Map common language names to tree-sitter filetype
function mapLanguage(lang?: string): string {
  if (!lang) return "typescript"

  const mapping: Record<string, string> = {
    ts: "typescript",
    typescript: "typescript",
    tsx: "typescript",
    js: "javascript",
    javascript: "javascript",
    jsx: "javascript",
    md: "markdown",
    markdown: "markdown",
    json: "json",
    zig: "zig",
    python: "python",
    py: "python",
    rust: "rust",
    rs: "rust",
    go: "go",
    bash: "bash",
    sh: "bash",
    shell: "bash",
    css: "css",
    html: "html",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    sql: "sql",
  }

  return mapping[lang.toLowerCase()] ?? "typescript"
}
