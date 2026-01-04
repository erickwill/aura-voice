import { useTheme } from "../context"

interface UserMessageProps {
  content: string
}

export function UserMessage(props: UserMessageProps) {
  const { theme } = useTheme()

  return (
    <box flexDirection="row">
      <text fg={theme.textMuted}>{"> "}</text>
      <text fg={theme.text}>{String(props.content || "")}</text>
    </box>
  )
}
