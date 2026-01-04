import { For, Show, createMemo } from "solid-js"
import { useTheme } from "../context"

export interface Command {
  name: string
  args?: string
  description: string
  category: "session" | "model" | "superpower" | "skill" | "other"
}

interface CommandPaletteProps {
  commands: Command[]
  filter: string
  selectedIndex: number
  visible: boolean
  maxVisible?: number
}

const categoryOrder = ["session", "model", "superpower", "skill", "other"] as const
const DEFAULT_MAX_VISIBLE = 8

export function CommandPalette(props: CommandPaletteProps) {
  const { theme } = useTheme()
  const maxVisible = () => props.maxVisible ?? DEFAULT_MAX_VISIBLE

  // Filter commands based on input
  const filtered = createMemo(() => {
    if (!props.visible) return []
    const filterLower = props.filter.toLowerCase()
    return props.commands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(filterLower) || cmd.description.toLowerCase().includes(filterLower)
    )
  })

  // Group by category
  const grouped = createMemo(() => {
    const map = new Map<string, Command[]>()
    for (const cmd of filtered()) {
      const list = map.get(cmd.category) || []
      list.push(cmd)
      map.set(cmd.category, list)
    }
    return map
  })

  // Calculate flat list with indices
  const flatList = createMemo(() => {
    const result: Array<{ cmd: Command; idx: number }> = []
    let idx = 0
    for (const category of categoryOrder) {
      const cmds = grouped().get(category)
      if (cmds) {
        for (const cmd of cmds) {
          result.push({ cmd, idx })
          idx++
        }
      }
    }
    return result
  })

  // Calculate visible window based on selection
  const visibleWindow = createMemo(() => {
    const list = flatList()
    const total = list.length
    const max = maxVisible()

    if (total <= max) {
      return { items: list, startIdx: 0, hasMore: false, hasLess: false }
    }

    const selected = props.selectedIndex
    // Keep selection centered in the window when possible
    let startIdx = Math.max(0, selected - Math.floor(max / 2))
    // Adjust if we're near the end
    if (startIdx + max > total) {
      startIdx = total - max
    }

    return {
      items: list.slice(startIdx, startIdx + max),
      startIdx,
      hasLess: startIdx > 0,
      hasMore: startIdx + max < total,
    }
  })

  return (
    <Show when={props.visible && filtered().length > 0}>
      <box
        flexDirection="column"
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        border="round"
        borderColor={theme.border}
      >
        {/* Scroll indicator - up */}
        <Show when={visibleWindow().hasLess}>
          <box paddingLeft={1}>
            <text fg={theme.textMuted}>▲ more above</text>
          </box>
        </Show>

        <For each={visibleWindow().items}>
          {(item) => {
            const isSelected = () => item.idx === props.selectedIndex
            return (
              <box flexDirection="column">
                {/* Command name line */}
                <box>
                  <text fg={isSelected() ? theme.primary : theme.text} bold={isSelected()}>
                    /{String(item.cmd.name || "")}
                  </text>
                  <Show when={item.cmd.args}>
                    <text fg={theme.textMuted}> {String(item.cmd.args || "")}</text>
                  </Show>
                </box>
                {/* Description on next line, indented */}
                <box paddingLeft={2}>
                  <text fg={theme.textMuted}>{String(item.cmd.description || "")}</text>
                </box>
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
      </box>
    </Show>
  )
}

// Built-in commands
export const builtinCommands: Command[] = [
  // Session commands
  { name: "help", description: "Show help", category: "other" },
  { name: "clear", description: "Clear conversation", category: "session" },
  { name: "resume", description: "Resume a session", category: "session" },
  { name: "rename", args: "<name>", description: "Rename current session", category: "session" },
  { name: "fork", args: "[name]", description: "Fork current session", category: "session" },

  // Model commands
  { name: "model", args: "[mode]", description: "Show/set routing mode", category: "model" },

  // Other
  { name: "skills", description: "List available skills", category: "other" },
  { name: "superpowers", description: "List multi-step workflows", category: "other" },
  { name: "image", args: "<file> [prompt]", description: "Analyze an image", category: "other" },
  { name: "logout", description: "Clear API key and re-authenticate", category: "other" },
  { name: "quit", description: "Exit 10x", category: "other" },
]

// Get all available commands including dynamic ones
export function getAllCommands(skills: string[], superpowers: string[]): Command[] {
  const commands = [...builtinCommands]

  // Add skills
  for (const skill of skills) {
    commands.push({
      name: skill,
      description: "Skill",
      category: "skill",
    })
  }

  // Add superpowers
  for (const sp of superpowers) {
    const name = sp.startsWith("/") ? sp.slice(1) : sp
    commands.push({
      name,
      description: "Superpower workflow",
      category: "superpower",
    })
  }

  return commands
}

// Sort commands by category order (same as display order)
function sortByCategory(commands: Command[]): Command[] {
  return [...commands].sort((a, b) => {
    const aIdx = categoryOrder.indexOf(a.category)
    const bIdx = categoryOrder.indexOf(b.category)
    return aIdx - bIdx
  })
}

// Get filtered commands for current input (sorted by category to match display order)
export function getFilteredCommands(allCommands: Command[], filter: string): Command[] {
  const sorted = sortByCategory(allCommands)

  if (!filter) return sorted

  const filterLower = filter.toLowerCase()
  return sorted.filter(
    (cmd) =>
      cmd.name.toLowerCase().startsWith(filterLower) || cmd.name.toLowerCase().includes(filterLower)
  )
}
