import { createSignal, createEffect, createMemo, onMount, Show, Switch, Match } from "solid-js"
import { useKeyboard, useTerminalDimensions, useRenderer } from "@opentui/solid"
import { useTheme, useExit } from "../context"
import { bannerLines } from "../styles/banner"
import { InputArea } from "./InputArea"
import { MessageList } from "./MessageList"
import { AuthPrompt } from "./AuthPrompt"
import { DeviceAuthFlow } from "./DeviceAuthFlow"
import { PermissionPrompt } from "./PermissionPrompt"
import { AskQuestionPrompt } from "./AskQuestionPrompt"
import { PlanApprovalPrompt } from "./PlanApprovalPrompt"
import { getAllCommands, getFilteredCommands } from "./CommandPalette"
import { SubcommandPicker, type SubcommandOption } from "./SubcommandPicker"
import { useChat } from "../hooks/useChat"
import { useSession } from "../hooks/useSession"
import { usePermissions } from "../hooks/usePermissions"
import { useAskQuestion } from "../hooks/useAskQuestion"
import { usePlanMode } from "../hooks/usePlanMode"
import { saveApiKey, getApiKey, getAuthToken, saveAuthToken, clearAuth, isAuthenticated, getAuthMode, type AuthMode } from "../config"
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
  SYSTEM_PROMPT,
  SECURITY_PROMPT,
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

type AppState = "loading" | "need_auth" | "device_auth" | "ready"

export function App(props: AppProps) {
  const initialModel = () => props.initialModel ?? "smart"
  const byok = () => props.byok ?? false

  const exit = useExit()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const renderer = useRenderer()

  const [appState, setAppState] = createSignal<AppState>("loading")
  const [apiKey, setApiKey] = createSignal<string | null>(null)
  const [authToken, setAuthToken] = createSignal<string | null>(null)
  const [authMode, setAuthMode] = createSignal<AuthMode | null>(null)
  const [inputValue, setInputValue] = createSignal("")
  const [showWelcome, setShowWelcome] = createSignal(true)
  const [systemMessage, setSystemMessage] = createSignal<string | null>(null)
  const [routingMode, setRoutingMode] = createSignal<RoutingMode>("auto")
  const [commandPaletteIndex, setCommandPaletteIndex] = createSignal(0)

  // Subcommand mode state
  const [subcommandMode, setSubcommandMode] = createSignal<{
    command: string
    options: SubcommandOption[]
    selectedIndex: number
  } | null>(null)

  // Session management
  const session = useSession({ defaultModel: initialModel() })

  // Permissions management
  const permissions = usePermissions()

  // Ask question management
  const askQuestion = useAskQuestion()

  // Plan mode management
  const planMode = usePlanMode()

  // Initialize on mount
  onMount(() => {
    // Check if user is authenticated (either BYOK or 10x auth)
    if (isAuthenticated()) {
      const mode = getAuthMode()
      setAuthMode(mode)

      if (mode === "byok") {
        const existingKey = getApiKey()
        if (existingKey) {
          setApiKey(existingKey)
        }
      } else if (mode === "10x") {
        const existingToken = getAuthToken()
        if (existingToken) {
          setAuthToken(existingToken)
        }
      }

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
    } else {
      setAppState("need_auth")
    }
  })

  // Build system prompt with guidance from 10X.md files, skills, and superpowers
  const systemPrompt = createMemo(() => {
    // Use the comprehensive system prompt from @10x/core with security guidelines
    const basePrompt = `${SYSTEM_PROMPT}\n\n${SECURITY_PROMPT}`
    const skillsSection = buildSkillsPromptSection()
    const superpowersSection = formatSuperpowersForPrompt()
    const combinedExtras = [skillsSection, superpowersSection].filter(Boolean).join("\n\n")
    return buildFullSystemPrompt(basePrompt, combinedExtras)
  })

  // Chat hook - configured based on auth mode
  const chat = useChat({
    apiKey: apiKey() ?? undefined,
    authToken: authToken() ?? undefined,
    authMode: authMode() ?? undefined,
    defaultTier: initialModel(),
    routingMode: routingMode(),
    systemPrompt: systemPrompt(),
    permissionManager: permissions.manager,
  })

  // Debug logging
  createEffect(() => {
    const msgs = chat.messages
    if (msgs.length > 0) {
      const lastMsg = msgs[msgs.length - 1]
      console.error('[DEBUG] Last message:', {
        role: lastMsg.role,
        contentType: typeof lastMsg.content,
        content: lastMsg.content?.slice?.(0, 100),
        toolCalls: lastMsg.toolCalls?.length,
      })
    }
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
    // Device auth flow handles its own keyboard input
    if (appState() === "device_auth") {
      return
    }

    if (appState() !== "ready") return

    if (evt.ctrl && evt.name === "c") {
      // If streaming, cancel the operation
      if (chat.isStreaming) {
        chat.cancel()
        return
      }
      if (inputValue()) {
        setInputValue("")
      } else {
        exit()
      }
    }
    // Escape cancels streaming or subcommand mode
    if (evt.name === "escape") {
      if (chat.isStreaming) {
        chat.cancel()
        return
      }
      if (subcommandMode()) {
        setSubcommandMode(null)
        return
      }
    }
    if (evt.ctrl && evt.name === "d") {
      exit()
    }

    // Subcommand picker navigation
    const mode = subcommandMode()
    if (mode) {
      if (evt.name === "up") {
        const newIdx = mode.selectedIndex > 0 ? mode.selectedIndex - 1 : mode.options.length - 1
        setSubcommandMode({ ...mode, selectedIndex: newIdx })
        return
      }
      if (evt.name === "down") {
        const newIdx = mode.selectedIndex < mode.options.length - 1 ? mode.selectedIndex + 1 : 0
        setSubcommandMode({ ...mode, selectedIndex: newIdx })
        return
      }
      if (evt.name === "return" || evt.name === "tab") {
        const selected = mode.options[mode.selectedIndex]
        if (selected) {
          const fullCommand = `/${mode.command} ${selected.value}`
          setSubcommandMode(null)
          setInputValue("")
          handleSubmit(fullCommand)
        }
        return
      }
    }

    // Command palette - handle Enter to execute selected command
    const showingPalette = inputValue().startsWith("/") && !chat.isStreaming && !permissions.pendingRequest
    if (showingPalette && evt.name === "return") {
      const commands = filteredCommands()
      const selected = commands[commandPaletteIndex()]
      if (selected) {
        // Check if command should show subcommand picker
        if (selected.name === "resume") {
          showResumeSubcommands()
          return
        }
        if (selected.name === "model") {
          showModelSubcommands()
          return
        }
        // Execute all other commands directly
        const fullCommand = `/${selected.name}`
        setInputValue("")
        handleSubmit(fullCommand)
        return
      }
    }
  })

  const handleApiKeySubmit = (key: string) => {
    saveApiKey(key)
    setApiKey(key)
    setAuthMode("byok")
    setAppState("ready")
  }

  const handleWebAuthSelect = () => {
    setAppState("device_auth")
  }

  const handleDeviceAuthSuccess = (token: string) => {
    saveAuthToken(token)
    setAuthToken(token)
    setAuthMode("10x")
    setAppState("ready")
  }

  const handleDeviceAuthError = (error: string) => {
    setSystemMessage(`Authentication error: ${error}`)
  }

  const handleDeviceAuthCancel = () => {
    setAppState("need_auth")
  }

  const handleAuthCancel = () => {
    exit()
  }

  // Subcommand mode handlers
  const handleSubcommandIndexChange = (index: number) => {
    const current = subcommandMode()
    if (current) {
      setSubcommandMode({ ...current, selectedIndex: index })
    }
  }

  const handleSubcommandSelect = (option: SubcommandOption) => {
    const mode = subcommandMode()
    if (!mode) return

    // Execute the command with the selected option
    const fullCommand = `/${mode.command} ${option.value}`
    setSubcommandMode(null)
    setInputValue("")
    handleSubmit(fullCommand)
  }

  const handleSubcommandCancel = () => {
    setSubcommandMode(null)
  }

  // Helper to show subcommand picker for /resume
  const showResumeSubcommands = () => {
    const sessions = session.list()
    if (sessions.length === 0) {
      setSystemMessage("No sessions found.")
      setInputValue("")
      return
    }

    const options: SubcommandOption[] = sessions.slice(0, 20).map((s, i) => ({
      value: s.name ?? s.id,
      label: s.name ?? s.lastUserPrompt ?? (s.messageCount === 0 ? "No messages" : s.id.slice(0, 8)),
      description: `${s.messageCount} msgs, ${s.updatedAt.toLocaleDateString()}`,
    }))

    setSubcommandMode({
      command: "resume",
      options,
      selectedIndex: 0,
    })
  }

  // Helper to show subcommand picker for /model
  const showModelSubcommands = () => {
    const options: SubcommandOption[] = [
      { value: "auto", label: "auto", description: "Auto-router selects best model" },
      { value: "superfast", label: "superfast", description: "Always use superfast (GPT OSS)" },
      { value: "fast", label: "fast", description: "Always use fast (Kimi K2)" },
      { value: "smart", label: "smart", description: "Always use smart (Opus 4.5)" },
    ]

    setSubcommandMode({
      command: "model",
      options,
      selectedIndex: 0,
    })
  }

  // Handler for when a command with args is selected - show subcommands if available
  const handleCommandWithArgsSelect = (command: { name: string; args?: string }) => {
    if (command.name === "resume") {
      showResumeSubcommands()
      return true
    }
    if (command.name === "model") {
      showModelSubcommands()
      return true
    }
    return false // Not handled, use default behavior
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
  /resume            Resume a session (shows picker)
  /rename <name>     Rename current session
  /fork [name]       Fork current session
  /model             Show/set routing mode
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

        case "resume":
          if (!args) {
            // Show the picker
            showResumeSubcommands()
          } else {
            // Direct resume with name/id
            const resumed = session.resume(args)
            if (resumed) {
              chat.loadMessages(resumed.messages)
              setShowWelcome(false)
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
          clearAuth()
          setApiKey(null)
          setAuthToken(null)
          setAuthMode(null)
          setAppState("need_auth")
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

        {/* Auth prompt */}
        <Match when={appState() === "need_auth"}>
          <box flexDirection="column">
            <box paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} flexDirection="column">
              <text fg="#22D3EE">{bannerLines[0]}</text>
              <text fg="#2DD4D0">{bannerLines[1]}</text>
              <text fg="#38BDF8">{bannerLines[2]}</text>
              <text fg="#6366F1">{bannerLines[3]}</text>
              <text fg="#8B5CF6">{bannerLines[4]}</text>
              <text fg="#A855F7">{bannerLines[5]}</text>
            </box>
            <AuthPrompt
              onSelectWebAuth={handleWebAuthSelect}
              onSubmitApiKey={handleApiKeySubmit}
              onCancel={handleAuthCancel}
            />
          </box>
        </Match>

        {/* Device auth flow */}
        <Match when={appState() === "device_auth"}>
          <box flexDirection="column">
            <box paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} flexDirection="column">
              <text fg="#22D3EE">{bannerLines[0]}</text>
              <text fg="#2DD4D0">{bannerLines[1]}</text>
              <text fg="#38BDF8">{bannerLines[2]}</text>
              <text fg="#6366F1">{bannerLines[3]}</text>
              <text fg="#8B5CF6">{bannerLines[4]}</text>
              <text fg="#A855F7">{bannerLines[5]}</text>
            </box>
            <DeviceAuthFlow
              onSuccess={handleDeviceAuthSuccess}
              onCancel={handleDeviceAuthCancel}
              onError={handleDeviceAuthError}
            />
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
                <span style={{ fg: theme.primary }}>{routingMode() === "auto" ? `auto (${String(chat.currentTier || "smart")})` : String(chat.currentTier || "smart")}</span>
                <Show when={planMode.planMode.active}>
                  <span style={{ fg: theme.textMuted }}> • </span>
                  <span style={{ fg: theme.warning, bold: true }}>PLAN MODE</span>
                </Show>
              </text>
              <text>
                <span style={{ fg: theme.textMuted }}>{process.cwd()}</span>
              </text>
            </box>

            {/* Main content area */}
            <box flexGrow={1} flexDirection="column">
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
                      <text fg={theme.textMuted}>{String(chat.currentTier || "smart")}</text>
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

              <Show when={chat.usageLimitExceeded}>
                <box marginTop={1} marginBottom={1} paddingLeft={2} paddingRight={2}>
                  <text fg="#F59E0B">⚠ Usage limit exceeded. Visit 10x.dev/billing to upgrade your plan.</text>
                </box>
              </Show>

              <Show when={chat.error && !chat.usageLimitExceeded}>
                <box marginTop={1} marginBottom={1}>
                  <text fg={theme.error}>Error: {String(chat.error || "Unknown error")}</text>
                </box>
              </Show>

              <Show when={chat.isStreaming}>
                <box marginTop={0} marginBottom={1} paddingLeft={2}>
                  <text fg={theme.textMuted}>Press Ctrl+C or Esc to cancel</text>
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

              <Show when={askQuestion.pendingRequest}>
                <AskQuestionPrompt
                  questions={askQuestion.pendingRequest!.questions}
                  onResponse={askQuestion.respond}
                />
              </Show>

              <Show when={planMode.pendingApproval}>
                <PlanApprovalPrompt
                  request={planMode.pendingApproval!}
                  onApprove={planMode.approve}
                  onReject={planMode.reject}
                />
              </Show>
            </box>

            {/* Subcommand picker - shown when selecting options for a command */}
            <Show when={subcommandMode()}>
              {(mode) => (
                <box flexShrink={0} flexGrow={0}>
                  <SubcommandPicker
                    command={mode().command}
                    options={mode().options}
                    selectedIndex={mode().selectedIndex}
                  />
                </box>
              )}
            </Show>

            {/* Input at bottom - fixed height */}
            <box flexShrink={0} flexGrow={0}>
              <InputArea
                value={inputValue()}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                disabled={chat.isStreaming || !!permissions.pendingRequest || !!askQuestion.pendingRequest || !!planMode.pendingApproval || !!subcommandMode()}
                commands={filteredCommands()}
                commandPaletteIndex={commandPaletteIndex()}
                onCommandPaletteIndexChange={setCommandPaletteIndex}
                onCommandWithArgsSelect={handleCommandWithArgsSelect}
              />
            </box>
          </box>
        </Match>
      </Switch>
    </box>
  )
}
