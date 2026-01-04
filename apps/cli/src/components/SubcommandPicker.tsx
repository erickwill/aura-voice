import { For, Show, createMemo } from "solid-js"
import { useTheme } from "../context"

export interface SubcommandOption {
  value: string
  label: string
  description?: string
}

interface SubcommandPickerProps {
  command: string
  options: SubcommandOption[]
  selectedIndex: number
  maxVisible?: number
}

const DEFAULT_MAX_VISIBLE = 8

export function SubcommandPicker(props: SubcommandPickerProps) {
  const { theme } = useTheme()
  const maxVisible = () => props.maxVisible ?? DEFAULT_MAX_VISIBLE

  // Calculate visible window for scrolling
  const visibleWindow = createMemo(() => {
    const total = props.options.length
    const max = maxVisible()

    if (total <= max) {
      return {
        items: props.options,
        startIdx: 0,
        hasLess: false,
        hasMore: false,
      }
    }

    let startIdx = Math.max(0, props.selectedIndex - Math.floor(max / 2))
    if (startIdx + max > total) {
      startIdx = total - max
    }

    return {
      items: props.options.slice(startIdx, startIdx + max),
      startIdx,
      hasLess: startIdx > 0,
      hasMore: startIdx + max < total,
    }
  })

  return (
    <box
      flexDirection="column"
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      marginLeft={1}
      marginRight={1}
      border="round"
      borderColor={theme.border}
    >
      {/* Header showing which command we're selecting for */}
      <box marginBottom={1}>
        <text fg={theme.primary} bold>
          /{props.command}
        </text>
        <text fg={theme.textMuted}> - select an option:</text>
      </box>

      {/* Scroll indicator - up */}
      <Show when={visibleWindow().hasLess}>
        <box paddingLeft={1}>
          <text fg={theme.textMuted}>▲ more above</text>
        </box>
      </Show>

      <For each={visibleWindow().items}>
        {(option, localIdx) => {
          const globalIdx = () => visibleWindow().startIdx + localIdx()
          const isSelected = () => globalIdx() === props.selectedIndex
          return (
            <box flexDirection="column">
              <box>
                <text fg={isSelected() ? theme.primary : theme.text} bold={isSelected()}>
                  {option.label}
                </text>
              </box>
              <Show when={option.description}>
                <box paddingLeft={2}>
                  <text fg={theme.textMuted}>{option.description}</text>
                </box>
              </Show>
            </box>
          )
        }}
      </For>

      {/* Scroll indicator - down */}
      <Show when={visibleWindow().hasMore}>
        <box paddingLeft={1}>
          <text fg={theme.textMuted}>▼ more below</text>
        </box>
      </Show>

      {/* Hint */}
      <box marginTop={1}>
        <text fg={theme.textMuted}>↑↓ navigate • Enter select • Esc cancel</text>
      </box>
    </box>
  )
}
