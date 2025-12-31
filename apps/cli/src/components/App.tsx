import { createSignal, createEffect, createMemo, onMount, Show, Switch, Match } from "solid-js"
import { useKeyboard, useTerminalDimensions, useRenderer } from "@opentui/solid"
import { useTheme, useExit } from "../context"
import { bannerLines } from "../styles/banner"
import { InputArea } from "./InputArea"
import { MessageList } from "./MessageList"
import { ApiKeyPrompt } from "./ApiKeyPrompt"
import { PermissionPrompt } from "./PermissionPrompt"
import { getAllCommands, getFilteredCommands } from "./CommandPalette"
import { useChat } from "../hooks/useChat"
import { useSession } from "../hooks/useSession"
import { usePermissions } from "../hooks/usePermissions"
import { saveApiKey, getApiKey, clearApiKey } from "../config"
import {
  buildFullSystemPrompt,
  buildSkillsPromptSection,
  getSkill,
  listSkillNames,
  isImageFile,
  createImagePart,
  createTextPart,
  parseMessageWithImages,
  getSuperpower,
  listSuperpowerTriggers,
  formatSuperpowersForPrompt,
} from "@10x/core"
import type { ModelTier, RoutingMode } from "@10x/shared"
import { existsSync } from "fs"
import { resolve } from "path"

interface AppProps {
  initialModel?: ModelTier
  byok?: boolean
  resumeSession?: string
  continueSession?: boolean
}

type AppState = "loading" | "need_api_key" | "ready"

export function App(props: AppProps) {
  const initialModel = () => props.initialModel ?? "smart"
  const byok = () => props.byok ?? false

  const exit = useExit()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const renderer = useRenderer()

  const [appState, setAppState] = createSignal<AppState>("loading")
  const [apiKey, setApiKey] = createSignal<string | null>(null)
  const [inputValue, setInputValue] = createSignal("")
  const [showWelcome, setShowWelcome] = createSignal(true)
  const [systemMessage, setSystemMessage] = createSignal<string | null>(null)
  const [routingMode, setRoutingMode] = createSignal<RoutingMode>("auto")
  const [commandPaletteIndex, setCommandPaletteIndex] = createSignal(0)

  // Session management
  const session = useSession({ defaultModel: initialModel() })

  // Permissions management
  const permissions = usePermissions()

  // Initialize on mount
  onMount(() => {
    const existingKey = getApiKey()
    if (existingKey) {
      setApiKey(existingKey)
      setAppState("ready")

      // Handle session resume
      if (props.resumeSession) {
        const resumed = session.resume(props.resumeSession)
        if (resumed) {
          setShowWelcome(false)
          setSystemMessage(`Resumed session: ${resumed.name ?? resumed.id}`)
        } else {
          setSystemMessage(`Session not found: ${props.resumeSession}`)
        }
      } else if (props.continueSession) {
        const last = session.resumeLast()
        if (last) {
          setShowWelcome(false)
          setSystemMessage(`Continued session: ${last.name ?? last.id}`)
        }
      }
    } else if (byok()) {
      setAppState("need_api_key")
    } else {
      setAppState("need_api_key")
    }
  })

  // Build system prompt with guidance from 10X.md files, skills, and superpowers
  const systemPrompt = createMemo(() => {
    const basePrompt = `You are 10x, a fast and helpful AI coding assistant. Be concise and direct. You have access to tools for reading, writing, and editing files, searching with glob and grep, and running bash commands.`
    const skillsSection = buildSkillsPromptSection()
    const superpowersSection = formatSuperpowersForPrompt()
    const combinedExtras = [skillsSection, superpowersSection].filter(Boolean).join("\n\n")
    return buildFullSystemPrompt(basePrompt, combinedExtras)
  })

  // Chat hook
  const chat = useChat({
    apiKey: apiKey() ?? "",
    defaultTier: initialModel(),
    routingMode: routingMode(),
    systemPrompt: systemPrompt(),
    permissionManager: permissions.manager,
  })

  // Build command list for palette
  const allCommands = createMemo(() => {
    const skills = listSkillNames()
    const superpowers = listSuperpowerTriggers()
    return getAllCommands(skills, superpowers)
  })

  // Command palette state
  const commandFilter = () => (inputValue().startsWith("/") ? inputValue().slice(1) : "")
  const filteredCommands = createMemo(() => getFilteredCommands(allCommands(), commandFilter()))

  // Reset palette index when filter changes
  createEffect(() => {
    commandFilter() // track dependency
    setCommandPaletteIndex(0)
  })

  // Global keyboard handling
  useKeyboard((evt) => {
    if (appState() !== "ready") return

    if (evt.ctrl && evt.name === "c") {
      if (inputValue()) {
        setInputValue("")
      } else {
        exit()
      }
    }
    if (evt.ctrl && evt.name === "d") {
      exit()
    }
  })

  const handleApiKeySubmit = (key: string) => {
    saveApiKey(key)
    setApiKey(key)
    setAppState("ready")
  }

  const handleApiKeyCancel = () => {
    exit()
  }

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return
    setSystemMessage(null)

    // Hide welcome on first message
    if (showWelcome()) {
      setShowWelcome(false)
    }

    // Handle slash commands
    if (value.startsWith("/")) {
      const parts = value.slice(1).trim().split(/\s+/)
      const command = parts[0]?.toLowerCase()
      const args = parts.slice(1).join(" ")

      switch (command) {
        case "help":
          setSystemMessage(`Commands:
  /help              Show this help
  /clear             Clear conversation
  /sessions          List recent sessions
  /resume <name>     Resume a session
  /rename <name>     Rename current session
  /fork [name]       Fork current session
  /model             Show current model
  /skills            List available skills
  /superpowers       List multi-step workflows
  /image <file>      Analyze an image
  /logout            Clear API key and re-authenticate
  /quit              Exit 10x

Image references: Use @path/to/image.png in messages
Skills: /<skill-name> [args]
Superpowers: /review, /pr, /refactor [args]`)
          setInputValue("")
          return

        case "clear":
          chat.clearMessages()
          session.clear()
          setShowWelcome(true)
          setInputValue("")
          return

        case "sessions": {
          const list = session.list()
          if (list.length === 0) {
            setSystemMessage("No sessions found.")
          } else {
            const formatted = list
              .slice(0, 10)
              .map((s, i) => {
                const name = s.name ?? s.id.slice(0, 8)
                const date = s.updatedAt.toLocaleDateString()
                const msgs = s.messageCount
                return `  ${i + 1}. ${name} (${msgs} msgs, ${date})`
              })
              .join("\n")
            setSystemMessage(`Recent sessions:\n${formatted}`)
          }
          setInputValue("")
          return
        }

        case "resume":
          if (!args) {
            setSystemMessage("Usage: /resume <name or id>")
          } else {
            const resumed = session.resume(args)
            if (resumed) {
              chat.clearMessages()
              setShowWelcome(false)
              setSystemMessage(`Resumed: ${resumed.name ?? resumed.id}`)
            } else {
              setSystemMessage(`Session not found: ${args}`)
            }
          }
          setInputValue("")
          return

        case "rename":
          if (!args) {
            setSystemMessage("Usage: /rename <name>")
          } else {
            if (session.rename(args)) {
              setSystemMessage(`Session renamed to: ${args}`)
            } else {
              setSystemMessage("No active session to rename.")
            }
          }
          setInputValue("")
          return

        case "fork": {
          const forked = session.fork(args || undefined)
          if (forked) {
            setSystemMessage(`Forked to: ${forked.name ?? forked.id}`)
          } else {
            setSystemMessage("No active session to fork.")
          }
          setInputValue("")
          return
        }

        case "model": {
          const validModes = ["auto", "superfast", "fast", "smart"]
          if (!args) {
            setSystemMessage(
              `Routing mode: ${routingMode()}${routingMode() === "auto" ? ` (currently using ${chat.currentTier})` : ""}\n\n` +
                `Usage: /model <mode>\n` +
                `  auto      - Auto-router selects best model\n` +
                `  superfast - Always use superfast (GPT OSS)\n` +
                `  fast      - Always use fast (Kimi K2)\n` +
                `  smart     - Always use smart (Opus 4.5)`
            )
          } else if (validModes.includes(args.toLowerCase())) {
            const newMode = args.toLowerCase() as RoutingMode
            setRoutingMode(newMode)
            setSystemMessage(`Routing mode set to: ${newMode}`)
          } else {
            setSystemMessage(`Invalid mode: ${args}\nValid modes: ${validModes.join(", ")}`)
          }
          setInputValue("")
          return
        }

        case "skills": {
          const skills = listSkillNames()
          if (skills.length === 0) {
            setSystemMessage("No skills found.\n\nCreate skills in .10x/skills/ or ~/.config/10x/skills/")
          } else {
            const formatted = skills.map((s) => `  /${s}`).join("\n")
            setSystemMessage(`Available skills:\n${formatted}\n\nInvoke with: /<skill-name> [args]`)
          }
          setInputValue("")
          return
        }

        case "superpowers": {
          const triggers = listSuperpowerTriggers()
          if (triggers.length === 0) {
            setSystemMessage(
              "No superpowers found.\n\nCreate superpowers in .10x/superpowers/ or ~/.config/10x/superpowers/"
            )
          } else {
            const formatted = triggers.map((t) => `  ${t}`).join("\n")
            setSystemMessage(
              `Available superpowers (multi-step workflows):\n${formatted}\n\nInvoke with: /<superpower> [args]`
            )
          }
          setInputValue("")
          return
        }

        case "image": {
          if (!args) {
            setSystemMessage("Usage: /image <path> [prompt]\n\nExample: /image screenshot.png What does this show?")
            setInputValue("")
            return
          }

          const imageParts = args.split(/\s+/)
          const imagePath = imageParts[0]
          const imagePrompt = imageParts.slice(1).join(" ") || "Describe this image in detail."
          const resolvedPath = imagePath.startsWith("/") ? imagePath : resolve(process.cwd(), imagePath)

          if (!existsSync(resolvedPath)) {
            setSystemMessage(`Image not found: ${imagePath}`)
            setInputValue("")
            return
          }

          if (!isImageFile(resolvedPath)) {
            setSystemMessage(`Not a supported image format: ${imagePath}\nSupported: png, jpg, jpeg, gif, webp`)
            setInputValue("")
            return
          }

          try {
            const multimodalContent = [
              createTextPart(`[Image: ${imagePath}]\n\n${imagePrompt}`),
              createImagePart(resolvedPath),
            ]

            setInputValue("")
            setShowWelcome(false)
            session.addMessage({ role: "user", content: `/image ${args}` })

            await chat.sendMessage(multimodalContent)

            const lastMsg = chat.messages[chat.messages.length - 1]
            if (lastMsg?.role === "assistant") {
              session.addMessage(lastMsg)
            }
          } catch (error) {
            setSystemMessage(`Failed to load image: ${error instanceof Error ? error.message : "Unknown error"}`)
            setInputValue("")
          }
          return
        }

        case "logout":
          clearApiKey()
          setApiKey(null)
          setAppState("need_api_key")
          setInputValue("")
          return

        case "quit":
        case "exit":
          exit()
          return

        default: {
          const skill = getSkill(command)
          if (skill) {
            const skillPrompt = args ? `${skill.content}\n\nUser request: ${args}` : skill.content

            setInputValue("")
            setShowWelcome(false)
            session.addMessage({ role: "user", content: `/${command} ${args}`.trim() })
            await chat.sendMessage(skillPrompt)

            const lastMsg = chat.messages[chat.messages.length - 1]
            if (lastMsg?.role === "assistant") {
              session.addMessage(lastMsg)
            }
            return
          }

          const superpower = getSuperpower(command)
          if (superpower) {
            const stepsDescription = superpower.steps
              .map((s) => `Step ${s.number}: ${s.name} (using ${s.model} model)\n${s.prompt}`)
              .join("\n\n---\n\n")

            const superpowerPrompt = `You are executing the "${superpower.name}" superpower - a multi-step workflow.

${superpower.description}

Follow these steps in order:

${stepsDescription}

---

User's request: ${args || "Execute this workflow"}

Execute each step thoroughly, showing your work for each step. Use the tools available to complete each step before moving to the next.`

            setInputValue("")
            setShowWelcome(false)
            session.addMessage({ role: "user", content: `/${command} ${args}`.trim() })
            await chat.sendMessage(superpowerPrompt)

            const lastMsg = chat.messages[chat.messages.length - 1]
            if (lastMsg?.role === "assistant") {
              session.addMessage(lastMsg)
            }
            return
          }

          setSystemMessage(`Unknown command: /${command}. Type /help for commands.`)
          setInputValue("")
          return
        }
      }
    }

    // Send message via chat hook
    setInputValue("")

    // Track in session
    session.addMessage({ role: "user", content: value })

    // Parse for @file image references
    const parsed = parseMessageWithImages(value, process.cwd())

    if (parsed.hasImages) {
      await chat.sendMessage(parsed.content)
    } else {
      await chat.sendMessage(value)
    }

    const lastMsg = chat.messages[chat.messages.length - 1]
    if (lastMsg?.role === "assistant") {
      session.addMessage(lastMsg)
    }
  }

  return (
    <box
      flexDirection="column"
      width={dimensions().width}
      height={dimensions().height}
      backgroundColor={theme.background}
    >
      <Switch>
        {/* Loading state */}
        <Match when={appState() === "loading"}>
          <box padding={1}>
            <text fg={theme.textMuted}>Loading...</text>
          </box>
        </Match>

        {/* API key prompt */}
        <Match when={appState() === "need_api_key"}>
          <box flexDirection="column">
            <box paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} flexDirection="column">
              <text fg="#22D3EE">{bannerLines[0]}</text>
              <text fg="#2DD4D0">{bannerLines[1]}</text>
              <text fg="#38BDF8">{bannerLines[2]}</text>
              <text fg="#6366F1">{bannerLines[3]}</text>
              <text fg="#8B5CF6">{bannerLines[4]}</text>
              <text fg="#A855F7">{bannerLines[5]}</text>
            </box>
            <ApiKeyPrompt onSubmit={handleApiKeySubmit} onCancel={handleApiKeyCancel} />
          </box>
        </Match>

        {/* Main app */}
        <Match when={appState() === "ready"}>
          <box flexDirection="column" flexGrow={1}>
            {/* Title bar - fixed height */}
            <box
              flexDirection="row"
              justifyContent="space-between"
              paddingLeft={1}
              paddingRight={1}
              paddingTop={0}
              paddingBottom={0}
              border={["top", "bottom"]}
              borderColor={theme.border}
              flexShrink={0}
              flexGrow={0}
            >
              <text>
                <span style={{ fg: theme.primary, bold: true }}>10x</span>
                <span style={{ fg: theme.textMuted }}> • </span>
                <span style={{ fg: theme.primary }}>◆ {routingMode() === "auto" ? `auto (${chat.currentTier})` : chat.currentTier}</span>
              </text>
              <text>
                <span style={{ fg: theme.textMuted }}>℗ {process.cwd()}</span>
              </text>
            </box>

            {/* Main content area */}
            <box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
              <Show
                when={!showWelcome() || chat.messages.length > 0}
                fallback={
                  <box flexDirection="column" alignItems="center">
                    <text fg={theme.text}>Welcome to 10x!</text>
                    <text>{"\n"}</text>
                    <text fg="#22D3EE">{bannerLines[0]}</text>
                    <text fg="#2DD4D0">{bannerLines[1]}</text>
                    <text fg="#38BDF8">{bannerLines[2]}</text>
                    <text fg="#6366F1">{bannerLines[3]}</text>
                    <text fg="#8B5CF6">{bannerLines[4]}</text>
                    <text fg="#A855F7">{bannerLines[5]}</text>
                    <text>{"\n"}</text>
                    <text fg={theme.textMuted}>{chat.currentTier}</text>
                    <text fg={theme.textMuted}>{process.cwd()}</text>
                  </box>
                }
              >
                <box flexDirection="column" paddingLeft={1} paddingRight={1} width="100%">
                  <MessageList messages={chat.messages} isStreaming={chat.isStreaming} />
                </box>
              </Show>

              <Show when={systemMessage()}>
                <box marginTop={1} marginBottom={1} paddingLeft={2}>
                  <text fg={theme.textMuted}>{systemMessage()}</text>
                </box>
              </Show>

              <Show when={chat.error}>
                <box marginTop={1} marginBottom={1}>
                  <text fg={theme.error}>Error: {chat.error}</text>
                </box>
              </Show>

              <Show when={permissions.pendingRequest}>
                <PermissionPrompt
                  tool={permissions.pendingRequest!.tool}
                  input={permissions.pendingRequest!.input}
                  context={permissions.pendingRequest!.context}
                  onResponse={permissions.respond}
                />
              </Show>
            </box>

            {/* Input at bottom - fixed height */}
            <box flexShrink={0} flexGrow={0}>
              <InputArea
                value={inputValue()}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                disabled={chat.isStreaming || !!permissions.pendingRequest}
                commands={filteredCommands()}
                commandPaletteIndex={commandPaletteIndex()}
                onCommandPaletteIndexChange={setCommandPaletteIndex}
              />
            </box>
          </box>
        </Match>
      </Switch>
    </box>
  )
}
