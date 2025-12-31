import { createMemo, For, Show } from "solid-js"
import { useTheme } from "../context"
import { UserMessage } from "./UserMessage"
import { AssistantMessage } from "./AssistantMessage"
import type { Message } from "@10x/shared"

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  maxHeight?: number | string
}

function generateMessageId(message: Message, index: number): string {
  const contentPreview = message.content.slice(0, 50).replace(/\s+/g, "_")
  return `${message.role}-${index}-${contentPreview}`
}

interface MessageWithId extends Message {
  _stableId: string
}

export function MessageList(props: MessageListProps) {
  const { theme } = useTheme()

  // Assign stable IDs to messages
  const messagesWithIds = createMemo((): MessageWithId[] => {
    return props.messages.map((message, index) => ({
      ...message,
      _stableId: generateMessageId(message, index),
    }))
  })

  // Split messages: completed ones vs current streaming one
  const lastMessage = () => messagesWithIds()[messagesWithIds().length - 1]
  const isLastStreaming = () => props.isStreaming && lastMessage()?.role === "assistant"

  // Completed messages (all except the currently streaming one)
  const completedMessages = createMemo(() =>
    isLastStreaming() ? messagesWithIds().slice(0, -1) : messagesWithIds()
  )

  // The currently streaming message (if any)
  const streamingMessage = () => (isLastStreaming() ? lastMessage() : null)

  return (
    <scrollbox
      scrollY={true}
      scrollX={false}
      stickyScroll={true}
      stickyStart="bottom"
      flexGrow={1}
      maxHeight={props.maxHeight}
    >
      <box flexDirection="column" gap={1}>
        {/* Render all messages in order */}
        <For each={completedMessages()}>
          {(message) => {
            if (message.role === "user") {
              return <UserMessage content={message.content} />
            }
            if (message.role === "assistant") {
              return <AssistantMessage message={message} isStreaming={false} />
            }
            if (message.role === "system") {
              return (
                <box paddingLeft={2} paddingTop={1} paddingBottom={1}>
                  <text fg={theme.textMuted}>{message.content}</text>
                </box>
              )
            }
            return null
          }}
        </For>

        {/* Currently streaming message */}
        <Show when={streamingMessage()}>
          {(msg) => <AssistantMessage message={msg()} isStreaming={true} />}
        </Show>

        {/* Thinking indicator */}
        <Show when={props.isStreaming && !streamingMessage()}>
          <box paddingLeft={2} gap={1}>
            <text fg={theme.primary}>...</text>
            <text fg={theme.textMuted}>Thinking...</text>
          </box>
        </Show>
      </box>
    </scrollbox>
  )
}
