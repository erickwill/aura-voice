import { Show } from "solid-js"
import { useTheme } from "../context"
import type { ModelTier, RoutingMode } from "@10x/shared"

interface StatusBarProps {
  modelTier: ModelTier
  routingMode: RoutingMode
  sessionName?: string
  isStreaming: boolean
  tokenUsage: { input: number; output: number }
  byok?: boolean
  maxContextTokens?: number
  cwd?: string
}

const tierConfig: Record<ModelTier, { icon: string; color: string; contextLimit: number }> = {
  superfast: { icon: "⚡⚡", color: "#22D3EE", contextLimit: 128000 },
  fast: { icon: "⚡", color: "#38BDF8", contextLimit: 128000 },
  smart: { icon: "◆", color: "#0EA5E9", contextLimit: 200000 },
}

function formatTokens(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return count.toString()
}

function getUsageColor(percentage: number): string {
  if (percentage >= 90) return "#EF4444"
  if (percentage >= 75) return "#F59E0B"
  return "#737373"
}

function truncatePath(path: string, maxLength: number = 30): string {
  if (path.length <= maxLength) return path

  const parts = path.split("/")
  let result = ""

  for (let i = parts.length - 1; i >= 0 && result.length < maxLength - 4; i--) {
    const newPart = parts[i] + (result ? "/" + result : "")
    if (newPart.length > maxLength - 4) break
    result = newPart
  }

  return "~/" + result
}

export function StatusBar(props: StatusBarProps) {
  const { theme } = useTheme()

  const tier = () => tierConfig[props.modelTier]
  const totalTokens = () => props.tokenUsage.input + props.tokenUsage.output
  const isAutoMode = () => props.routingMode === "auto"

  const contextLimit = () => props.maxContextTokens ?? tier().contextLimit
  const usagePercentage = () => (contextLimit() > 0 ? (totalTokens() / contextLimit()) * 100 : 0)
  const usageColor = () => getUsageColor(usagePercentage())
  const showContextWarning = () => usagePercentage() >= 75

  return (
    <box
      flexDirection="row"
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      justifyContent="space-between"
      border={["bottom"]}
      borderColor={showContextWarning() ? theme.warning : theme.border}
    >
      {/* Left section: branding, mode, model */}
      <text>
        <span style={{ fg: theme.primary, bold: true }}>10x</span>
        <span style={{ fg: theme.textMuted }}> • </span>
        <Show when={props.byok}>
          <span style={{ fg: theme.textMuted }}>byok • </span>
        </Show>
        <span style={{ fg: tier().color }}>{tier().icon} {isAutoMode() ? `auto (${props.modelTier})` : props.modelTier}</span>
        <Show when={props.isStreaming}>
          <span style={{ fg: tier().color }}> ...</span>
        </Show>
      </text>

      {/* Right section: cwd, tokens */}
      <text>
        <Show when={props.cwd}>
          <span style={{ fg: theme.textMuted }}>℗ {truncatePath(props.cwd!)} • </span>
        </Show>
        <Show when={props.sessionName}>
          <span style={{ fg: theme.text }}>{props.sessionName} • </span>
        </Show>
        <span style={{ fg: usageColor() }}>{formatTokens(totalTokens())}</span>
        <span style={{ fg: theme.textMuted }}>/{formatTokens(contextLimit())}</span>
        <Show when={showContextWarning()}>
          <span style={{ fg: theme.warning }}> ({usagePercentage().toFixed(0)}%)</span>
        </Show>
      </text>
    </box>
  )
}
