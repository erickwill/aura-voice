import { Show, Switch, Match } from "solid-js"
import { useTheme } from "../context"
import { FileLink } from "./FileLink"
import type { ToolCall } from "@10x/shared"

interface ToolCallDisplayProps {
  toolCall: ToolCall
}

// Tool-specific colors (matching Claude Code style)
const TOOL_COLORS: Record<string, string> = {
  read: "#22C55E",    // green
  write: "#F59E0B",   // amber
  edit: "#3B82F6",    // blue
  bash: "#A855F7",    // purple
  glob: "#8B5CF6",    // violet
  grep: "#EC4899",    // pink
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + "..."
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getToolArgs(toolCall: ToolCall): string {
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
      return truncate(String(input.command ?? ""), 60)
    default:
      return truncate(JSON.stringify(input), 50)
  }
}

function getResultSummary(toolCall: ToolCall): string | null {
  if (toolCall.status !== "success" || !toolCall.output) return null

  const output = toolCall.output.output
  if (!output) return "(No content)"

  // For file reads, show line count
  if (toolCall.name === "read") {
    const lines = String(output).split("\n").length
    return `Read ${lines} lines`
  }

  // For writes, show success
  if (toolCall.name === "write") {
    return "Written"
  }

  // For edits
  if (toolCall.name === "edit") {
    return "Edited"
  }

  // For bash, truncate output
  if (toolCall.name === "bash") {
    const lines = String(output).trim().split("\n")
    if (lines.length === 1) {
      return truncate(lines[0], 80)
    }
    return `${lines.length} lines`
  }

  // For glob/grep, show match count
  if (toolCall.name === "glob" || toolCall.name === "grep") {
    const lines = String(output).trim().split("\n").filter(l => l.trim())
    return `Found ${lines.length} matches`
  }

  return truncate(String(output), 80)
}

export function ToolCallDisplay(props: ToolCallDisplayProps) {
  const { theme } = useTheme()

  const bulletColor = () => TOOL_COLORS[props.toolCall.name] ?? theme.textMuted
  const toolName = () => capitalizeFirst(props.toolCall.name)
  const args = () => getToolArgs(props.toolCall)
  const resultSummary = () => getResultSummary(props.toolCall)

  return (
    <box flexDirection="column" marginBottom={1}>
      {/* Main tool call line: ● ToolName(args) */}
      <box flexDirection="row">
        <Switch>
          <Match when={props.toolCall.status === "running"}>
            <text fg={bulletColor()}>{"⠋ "}</text>
          </Match>
          <Match when={props.toolCall.status === "error"}>
            <text fg={theme.error}>{"✗ "}</text>
          </Match>
          <Match when={true}>
            <text fg={bulletColor()}>{"● "}</text>
          </Match>
        </Switch>
        <text fg={theme.text} bold>{toolName()}</text>
        <text fg={theme.textMuted}>{"("}</text>
        <text fg={theme.text}>{args()}</text>
        <text fg={theme.textMuted}>{")"}</text>
      </box>

      {/* Result line */}
      <Show when={resultSummary()}>
        <box flexDirection="row" paddingLeft={2}>
          <text fg={theme.textMuted}>{"└─ "}</text>
          <text fg={theme.textMuted}>{resultSummary()}</text>
        </box>
      </Show>

      {/* Error line */}
      <Show when={props.toolCall.status === "error" && props.toolCall.output?.error}>
        <box flexDirection="row" paddingLeft={2}>
          <text fg={theme.textMuted}>{"└─ "}</text>
          <text fg={theme.error}>{truncate(String(props.toolCall.output!.error || ""), 100)}</text>
        </box>
      </Show>
    </box>
  )
}
