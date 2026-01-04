import { Show, For } from "solid-js"
import { useTheme } from "../context"
import { Markdown } from "./Markdown"
import { ToolCallDisplay } from "./ToolCallDisplay"
import type { Message } from "@10x/shared"

interface AssistantMessageProps {
  message: Message
  isStreaming?: boolean
}

export function AssistantMessage(props: AssistantMessageProps) {
  const { theme } = useTheme()

  const modelLabel = () => {
    if (!props.message.modelTier) return "10x"
    switch (props.message.modelTier) {
      case "superfast":
        return "superfast"
      case "fast":
        return "fast"
      default:
        return "smart"
    }
  }

  return (
    <box flexDirection="column" marginTop={1} marginBottom={1}>
      <box marginBottom={1}>
        <text fg={theme.primary} bold>
          {modelLabel()}
        </text>
        <Show when={props.isStreaming}>
          <text fg={theme.textMuted}> typing...</text>
        </Show>
      </box>

      {/* Tool calls */}
      <Show when={props.message.toolCalls && props.message.toolCalls.length > 0}>
        <box flexDirection="column" marginBottom={1}>
          <For each={props.message.toolCalls}>
            {(toolCall) => <ToolCallDisplay toolCall={toolCall} />}
          </For>
        </box>
      </Show>

      {/* Message content */}
      <Show when={props.message.content}>
        <box paddingLeft={2}>
          <Markdown>{String(props.message.content || "")}</Markdown>
        </box>
      </Show>
    </box>
  )
}
