import { Show, createMemo } from "solid-js"
import { SyntaxStyle } from "@opentui/core"
import { useTheme } from "../context"
import "../types/opentui.d.ts"

interface DiffViewerProps {
  diff: string
  filetype?: string
  view?: "unified" | "split"
  showLineNumbers?: boolean
  title?: string
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
  default: { fg: { r: 230, g: 237, b: 243, a: 255 } },
}

export function DiffViewer(props: DiffViewerProps) {
  const { theme } = useTheme()
  const syntaxStyle = createMemo(() => SyntaxStyle.fromStyles(syntaxStyles))

  return (
    <box flexDirection="column" marginTop={1} marginBottom={1}>
      <Show when={props.title}>
        <box paddingLeft={1} marginBottom={1}>
          <text fg={theme.textMuted}>{props.title}</text>
        </box>
      </Show>
      <box paddingLeft={1}>
        <diff
          diff={props.diff}
          view={props.view ?? "unified"}
          filetype={props.filetype ?? "typescript"}
          syntaxStyle={syntaxStyle()}
          showLineNumbers={props.showLineNumbers ?? true}
          wrapMode="word"
          width="100%"
          fg={theme.text}
          addedBg="#1a4d1a"
          removedBg="#4d1a1a"
          contextBg="transparent"
          addedSignColor="#22c55e"
          removedSignColor="#ef4444"
          lineNumberFg="#6b7280"
          lineNumberBg="#161b22"
          addedLineNumberBg="#0d3a0d"
          removedLineNumberBg="#3a0d0d"
          selectionBg="#264F78"
          selectionFg="#FFFFFF"
        />
      </box>
    </box>
  )
}

// Helper to detect filetype from filename
export function getFiletypeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript"
    case "js":
    case "jsx":
      return "javascript"
    case "md":
    case "markdown":
      return "markdown"
    case "json":
      return "json"
    case "zig":
      return "zig"
    case "py":
      return "python"
    case "rs":
      return "rust"
    case "go":
      return "go"
    default:
      return "typescript"
  }
}
