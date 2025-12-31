import { useTheme } from "../context"

interface UserMessageProps {
  content: string
}

export function UserMessage(props: UserMessageProps) {
  const { theme } = useTheme()

  return (
    <box flexDirection="column" marginTop={1} marginBottom={1}>
      <box marginBottom={1}>
        <text fg={theme.info} bold>
          You
        </text>
      </box>
      <box paddingLeft={2}>
        <text fg={theme.text}>{props.content}</text>
      </box>
    </box>
  )
}
