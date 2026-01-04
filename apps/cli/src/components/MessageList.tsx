import { For, Show } from "solid-js"
import { useTheme } from "../context"
import { UserMessage } from "./UserMessage"
import { AssistantMessage } from "./AssistantMessage"
import { ThinkingIndicator } from "./ThinkingIndicator"
import type { Message } from "@10x/shared"

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  maxHeight?: number | string
}

export function MessageList(props: MessageListProps) {
  const { theme } = useTheme()

  // Show thinking indicator when streaming and waiting for content
  const showThinkingIndicator = () => {
    if (!props.isStreaming) return false
    if (props.messages.length === 0) return true
    const last = props.messages[props.messages.length - 1]
    // Show if last message is user (waiting for response)
    if (last?.role === "user") return true
    // Show if assistant message has no content yet
    if (last?.role === "assistant" && !last.content && (!last.toolCalls || last.toolCalls.length === 0)) return true
    return false
  }

  return (
    <box flexDirection="column" flexGrow={1} width="100%">
      {/* Render all messages in order */}
      <For each={props.messages}>
        {(message, index) => (
          <box flexDirection="column" marginTop={index() > 0 ? 1 : 0} width="100%">
            <Show when={message.role === "user"}>
              <UserMessage content={message.content} />
            </Show>
            <Show when={message.role === "assistant"}>
              <AssistantMessage message={message} isStreaming={props.isStreaming && index() === props.messages.length - 1} />
            </Show>
            <Show when={message.role === "system"}>
              <text fg={theme.textMuted}>{String(message.content || "")}</text>
            </Show>
          </box>
        )}
      </For>

      {/* Thinking indicator - shown at the bottom when waiting for response */}
      <Show when={showThinkingIndicator()}>
        <box marginTop={1}>
          <ThinkingIndicator />
        </box>
      </Show>
    </box>
  )
}
