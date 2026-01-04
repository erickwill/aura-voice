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

  return (
    <box flexDirection="column" width="100%">
      {/* Tool calls */}
      <Show when={props.message.toolCalls && props.message.toolCalls.length > 0}>
        <For each={props.message.toolCalls}>
          {(toolCall) => <ToolCallDisplay toolCall={toolCall} />}
        </For>
      </Show>

      {/* Message content */}
      <Show when={props.message.content}>
        <Markdown>{String(props.message.content || "")}</Markdown>
      </Show>
    </box>
  )
}
