import { createSignal, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useTheme } from "../context"

interface PermissionPromptProps {
  tool: string
  input: string
  context?: string
  onResponse: (allowed: boolean) => void
}

function getToolIcon(tool: string): string {
  switch (tool) {
    case "bash":
      return "$"
    case "write":
      return "+"
    case "edit":
      return "~"
    case "read":
      return "#"
    default:
      return "?"
  }
}

function getToolColor(tool: string, theme: any): any {
  switch (tool) {
    case "bash":
      return theme.warning
    case "write":
      return theme.success
    case "edit":
      return theme.info
    default:
      return theme.textMuted
  }
}

export function PermissionPrompt(props: PermissionPromptProps) {
  const { theme } = useTheme()
  const [submitted, setSubmitted] = createSignal(false)

  useKeyboard((evt) => {
    if (submitted()) return

    const input = evt.name?.toLowerCase() || ""

    if (input === "y") {
      setSubmitted(true)
      props.onResponse(true)
    } else if (input === "n" || input === "escape") {
      setSubmitted(true)
      props.onResponse(false)
    }
  })

  const displayInput = () => (props.input.length > 80 ? props.input.slice(0, 77) + "..." : props.input)

  return (
    <box
      flexDirection="column"
      border={["top", "bottom", "left", "right"]}
      borderColor={theme.warning}
      paddingLeft={1}
      paddingRight={1}
      marginTop={1}
      marginBottom={1}
    >
      <box>
        <text fg={theme.warning} bold>
          Permission Required
        </text>
      </box>

      <box marginTop={1}>
        <text fg={getToolColor(props.tool, theme)}>{getToolIcon(props.tool)} </text>
        <text bold fg={theme.text}>
          {props.tool}
        </text>
      </box>

      <box marginTop={1} flexDirection="column">
        <text fg={theme.textMuted}>{displayInput()}</text>
      </box>

      <Show when={props.context}>
        <box marginTop={1}>
          <text fg={theme.textMuted}>{props.context}</text>
        </box>
      </Show>

      <box marginTop={1}>
        <text fg={theme.success} bold>
          [Y]
        </text>
        <text fg={theme.textMuted}> Allow </text>
        <text fg={theme.error} bold>
          [N]
        </text>
        <text fg={theme.textMuted}> Deny </text>
      </box>
    </box>
  )
}
