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
}

const categoryOrder = ["session", "model", "superpower", "skill", "other"] as const

export function CommandPalette(props: CommandPaletteProps) {
  const { theme } = useTheme()

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

  return (
    <Show when={props.visible && filtered().length > 0}>
      <box flexDirection="column" paddingLeft={1} paddingRight={1}>
        <Show when={filtered().length === 0}>
          <text fg={theme.textMuted}>No matching commands</text>
        </Show>

        <For each={flatList()}>
          {(item) => {
            const isSelected = () => item.idx === props.selectedIndex
            return (
              <box gap={1}>
                <text fg={isSelected() ? theme.primary : theme.text} bold={isSelected()}>
                  {isSelected() ? ">" : " "}
                </text>
                <text fg={isSelected() ? theme.primary : theme.secondary} bold={isSelected()}>
                  /{item.cmd.name}
                </text>
                <Show when={item.cmd.args}>
                  <text fg={theme.textMuted}>{item.cmd.args}</text>
                </Show>
                <text fg={theme.textMuted}>{item.cmd.description}</text>
              </box>
            )
          }}
        </For>
      </box>
    </Show>
  )
}

// Built-in commands
export const builtinCommands: Command[] = [
  // Session commands
  { name: "help", description: "Show help", category: "other" },
  { name: "clear", description: "Clear conversation", category: "session" },
  { name: "sessions", description: "List recent sessions", category: "session" },
  { name: "resume", args: "<name>", description: "Resume a session", category: "session" },
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

// Get filtered commands for current input
export function getFilteredCommands(allCommands: Command[], filter: string): Command[] {
  if (!filter) return allCommands.slice(0, 10)

  const filterLower = filter.toLowerCase()
  return allCommands
    .filter(
      (cmd) =>
        cmd.name.toLowerCase().startsWith(filterLower) || cmd.name.toLowerCase().includes(filterLower)
    )
    .slice(0, 10)
}
