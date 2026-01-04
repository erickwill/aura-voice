import { createSignal } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useTheme } from "../context"
import type { PlanApprovalRequest } from "../hooks/usePlanMode"

interface PlanApprovalPromptProps {
  request: PlanApprovalRequest
  onApprove: () => void
  onReject: () => void
}

export function PlanApprovalPrompt(props: PlanApprovalPromptProps) {
  const { theme } = useTheme()
  const [selectedOption, setSelectedOption] = createSignal<"approve" | "reject">("approve")

  useKeyboard((evt) => {
    if (evt.name === "left" || evt.name === "h") {
      setSelectedOption("approve")
      return
    }

    if (evt.name === "right" || evt.name === "l") {
      setSelectedOption("reject")
      return
    }

    if (evt.name === "return") {
      if (selectedOption() === "approve") {
        props.onApprove()
      } else {
        props.onReject()
      }
      return
    }

    // Quick keys
    if (evt.sequence === "y" || evt.sequence === "Y") {
      props.onApprove()
      return
    }
    if (evt.sequence === "n" || evt.sequence === "N") {
      props.onReject()
      return
    }
  })

  // Truncate plan content for display
  const displayContent = () => {
    const content = props.request.planContent
    const lines = content.split("\n")
    const maxLines = 20

    if (lines.length <= maxLines) {
      return content
    }

    return lines.slice(0, maxLines).join("\n") + `\n\n... (${lines.length - maxLines} more lines)`
  }

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
          Plan Approval Required
        </text>
      </box>

      <box marginTop={1}>
        <text fg={theme.textMuted}>
          File: {props.request.planFilePath}
        </text>
      </box>

      <box
        marginTop={1}
        flexDirection="column"
        border={["top", "bottom", "left", "right"]}
        borderColor={theme.border}
        paddingLeft={1}
        paddingRight={1}
        maxHeight={25}
      >
        <text fg={theme.text}>{displayContent()}</text>
      </box>

      <box marginTop={1}>
        <text fg={theme.text}>Do you approve this plan?</text>
      </box>

      <box marginTop={1}>
        <text
          fg={selectedOption() === "approve" ? theme.success : theme.textMuted}
          bold={selectedOption() === "approve"}
        >
          {selectedOption() === "approve" ? "> " : "  "}[Y] Approve
        </text>
        <text fg={theme.textMuted}>  </text>
        <text
          fg={selectedOption() === "reject" ? theme.error : theme.textMuted}
          bold={selectedOption() === "reject"}
        >
          {selectedOption() === "reject" ? "> " : "  "}[N] Reject
        </text>
      </box>

      <box marginTop={1}>
        <text fg={theme.textMuted}>
          Press Y/N or use arrow keys and Enter
        </text>
      </box>
    </box>
  )
}
