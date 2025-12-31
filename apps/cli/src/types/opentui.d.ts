import type { DiffOptions, LineNumberOptions, RGBA } from "@opentui/core"
import "@opentui/solid"

// Extend OpenTUI JSX types with diff and line_number elements
declare module "@opentui/solid" {
  namespace JSX {
    interface IntrinsicElements {
      diff: DiffProps
      line_number: LineNumberProps
    }
  }
}

interface DiffProps {
  diff: string
  view?: "unified" | "split"
  filetype?: string
  syntaxStyle?: any
  showLineNumbers?: boolean
  wrapMode?: "none" | "word"
  conceal?: boolean
  fg?: string | RGBA
  addedBg?: string | RGBA
  removedBg?: string | RGBA
  contextBg?: string | RGBA
  addedSignColor?: string | RGBA
  removedSignColor?: string | RGBA
  lineNumberFg?: string | RGBA
  lineNumberBg?: string | RGBA
  addedLineNumberBg?: string | RGBA
  removedLineNumberBg?: string | RGBA
  selectionBg?: string | RGBA
  selectionFg?: string | RGBA
  width?: number | string
  height?: number | string
  flexGrow?: number
  flexShrink?: number
}

interface LineNumberProps {
  target: any
  minWidth?: number
  paddingRight?: number
  fg?: string | RGBA
  bg?: string | RGBA
  width?: number | string
}
