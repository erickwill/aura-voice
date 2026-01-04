import { Show, Switch, Match } from "solid-js"
import { useTheme } from "../context"
import { FileLink } from "./FileLink"
import type { ToolCall } from "@10x/shared"

interface ToolCallDisplayProps {
  toolCall: ToolCall
}

const TOOL_ICONS: Record<string, string> = {
  read: "📖",
  write: "✏️",
  edit: "📝",
  glob: "🔍",
  grep: "🔎",
  bash: "$",
}

// Tools that work with file paths
const FILE_TOOLS = ["read", "write", "edit"]

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + "..."
}

function getToolSummary(toolCall: ToolCall): string {
  const input = toolCall.input

  switch (toolCall.name) {
    case "read":
      return String(input.path ?? "")
    case "write":
      return String(input.path ?? "")
    case "edit":
      return String(input.path ?? "")
    case "glob":
      return String(input.pattern ?? "")
    case "grep":
      return String(input.pattern ?? "")
    case "bash":
      return truncate(String(input.command ?? ""), 50)
    default:
      return JSON.stringify(input).slice(0, 50)
  }
}

function StatusIndicator(props: { status: ToolCall["status"] }) {
  const { theme } = useTheme()

  return (
    <Switch>
      <Match when={props.status === "pending"}>
        <text fg={theme.textMuted}>○</text>
      </Match>
      <Match when={props.status === "running"}>
        <text fg={theme.primary}>...</text>
      </Match>
      <Match when={props.status === "success"}>
        <text fg={theme.success}>✓</text>
      </Match>
      <Match when={props.status === "error"}>
        <text fg={theme.error}>✗</text>
      </Match>
    </Switch>
  )
}

export function ToolCallDisplay(props: ToolCallDisplayProps) {
  const { theme } = useTheme()

  const icon = () => TOOL_ICONS[props.toolCall.name] ?? "?"
  const summary = () => getToolSummary(props.toolCall)
  const isFileTool = () => FILE_TOOLS.includes(props.toolCall.name)
  const filePath = () => String(props.toolCall.input?.path ?? "")

  return (
    <box flexDirection="column" marginTop={1} marginBottom={1}>
      <box flexDirection="row">
        <text fg={theme.textMuted}>│ ┌─ </text>
        <text>{String(icon() || "?")} </text>
        <text fg={theme.text} bold>
          {String(props.toolCall.name || "")}
        </text>
        <text fg={theme.textMuted}>: </text>
        <Show
          when={isFileTool() && filePath()}
          fallback={<text fg={theme.textMuted}>{String(summary() || "")}</text>}
        >
          <FileLink path={filePath()} />
        </Show>
        <text> </text>
        <StatusIndicator status={props.toolCall.status} />
      </box>

      <Show when={props.toolCall.status === "success" && props.toolCall.output?.output}>
        <box paddingLeft={4}>
          <text fg={theme.textMuted}>│ └─ </text>
          <text fg={theme.success}>{truncate(String(props.toolCall.output!.output || ""), 100)}</text>
        </box>
      </Show>

      <Show when={props.toolCall.status === "error" && props.toolCall.output?.error}>
        <box paddingLeft={4}>
          <text fg={theme.textMuted}>│ └─ </text>
          <text fg={theme.error}>{truncate(String(props.toolCall.output!.error || ""), 100)}</text>
        </box>
      </Show>
    </box>
  )
}
