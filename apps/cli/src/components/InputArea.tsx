import { createSignal, createEffect, onMount, onCleanup } from "solid-js"
import { useKeyboard, useRenderer } from "@opentui/solid"
import { TextareaRenderable, type KeyBinding } from "@opentui/core"
import clipboardy from "clipboardy"
import { useTheme } from "../context"
import type { Command } from "./CommandPalette"

async function getClipboard(): Promise<string> {
  // Try native pbpaste first on macOS (more reliable)
  if (process.platform === "darwin") {
    try {
      const proc = Bun.spawn(["pbpaste"], { stdout: "pipe" })
      const text = await new Response(proc.stdout).text()
      return text
    } catch {}
  }
  // Fallback to clipboardy
  try {
    return await clipboardy.read()
  } catch {
    return ""
  }
}

const MAX_HISTORY = 100

interface InputAreaProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  disabled?: boolean
  placeholder?: string
  commands?: Command[]
  commandPaletteIndex?: number
  onCommandPaletteIndexChange?: (index: number) => void
  onHistorySearch?: () => void
}

export function InputArea(props: InputAreaProps) {
  const { theme } = useTheme()
  const renderer = useRenderer()
  let input: TextareaRenderable

  // Command history
  const [history, setHistory] = createSignal<string[]>([])
  const [historyIndex, setHistoryIndex] = createSignal(-1)
  let savedInput = ""

  // Command palette state
  const showPalette = () => props.value.startsWith("/") && !props.disabled && (props.commands?.length ?? 0) > 0

  // Register global paste handler (bypasses OpenTUI's broken paste detection)
  const handlePaste = (text: string) => {
    if (props.disabled) return
    if (!input) return
    const cleanedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    if (cleanedText) {
      input.insertText(cleanedText)
      props.onChange(input.plainText)
    }
  }

  onMount(() => {
    ;(globalThis as any).__10xPasteHandler = handlePaste
  })

  onCleanup(() => {
    ;(globalThis as any).__10xPasteHandler = null
  })

  // Global keyboard handler for Cmd/Ctrl+V fallback (in case bracketed paste doesn't work)
  useKeyboard(async (evt) => {
    if (props.disabled) return
    if (!input) return

    const keyName = evt.name?.toLowerCase()
    if ((evt.meta || evt.ctrl) && keyName === "v") {
      const clipboardText = await getClipboard()
      if (clipboardText) {
        input.insertText(clipboardText)
        props.onChange(input.plainText)
      }
    }
  })

  // Keybindings for textarea
  const textareaKeybindings: KeyBinding[] = [
    { name: "return", action: "submit" },
    { name: "return", meta: true, action: "newline" },
    { name: "up", action: "move-up" },
    { name: "down", action: "move-down" },
    { name: "left", action: "move-left" },
    { name: "right", action: "move-right" },
    { name: "backspace", action: "backspace" },
    { name: "delete", action: "delete" },
    { name: "home", action: "line-home" },
    { name: "end", action: "line-end" },
    { name: "a", ctrl: true, action: "line-home" },
    { name: "e", ctrl: true, action: "line-end" },
    { name: "u", ctrl: true, action: "delete-to-line-start" },
    { name: "k", ctrl: true, action: "delete-to-line-end" },
    { name: "w", ctrl: true, action: "delete-word-backward" },
    { name: "left", meta: true, action: "word-backward" },
    { name: "right", meta: true, action: "word-forward" },
    { name: "backspace", meta: true, action: "delete-word-backward" },
    // Paste keybindings
    { name: "v", meta: true, action: "paste" },
    { name: "v", ctrl: true, action: "paste" },
    { name: "V", meta: true, action: "paste" },
    { name: "V", ctrl: true, action: "paste" },
  ]

  function submit() {
    if (props.disabled) return
    const value = input.plainText
    if (value.trim()) {
      setHistory((prev) => {
        const newHistory =
          prev[prev.length - 1] === value.trim()
            ? prev
            : [...prev.slice(-(MAX_HISTORY - 1)), value.trim()]
        return newHistory
      })
      setHistoryIndex(-1)
      savedInput = ""
    }
    props.onSubmit(value)
    input.clear()
  }


  // Handle special keys via useKeyboard for escape and history search
  useKeyboard((evt) => {
    if (props.disabled) return
    if (!input?.focused) return

    const key = evt.name || ""
    const isCtrl = evt.ctrl ?? false

    // Escape to clear
    if (key === "escape") {
      if (props.value) {
        setHistoryIndex(-1)
        props.onChange("")
        input.clear()
      }
      return
    }

    // Ctrl+R for history search
    if (isCtrl && key === "r") {
      if (props.onHistorySearch) {
        props.onHistorySearch()
      }
      return
    }
  })

  createEffect(() => {
    if (input) {
      input.focus()
      input.cursorColor = theme.text
    }
  })

  // Fixed number of suggestion lines to prevent layout shifts
  const SUGGESTION_LINES = 6
  const displayCommands = () => (showPalette() ? (props.commands || []).slice(0, SUGGESTION_LINES) : [])

  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1} paddingBottom={1}>
      {/* Input line with native textarea */}
      <box
        border={["top", "bottom"]}
        borderColor={theme.border}
        paddingLeft={1}
        paddingRight={1}
        paddingTop={0}
        paddingBottom={0}
        flexDirection="row"
      >
        <text fg={theme.textMuted}>
          {">"}{" "}
        </text>
        <textarea
          placeholder={props.disabled ? "Waiting..." : props.placeholder ?? "Try \"edit <filepath> to...\""}
          textColor={theme.text}
          focusedTextColor={theme.text}
          minHeight={1}
          maxHeight={6}
          flexGrow={1}
          autoFocus
          onContentChange={() => {
            const value = input.plainText
            props.onChange(value)
          }}
          keyBindings={textareaKeybindings}
          onPaste={(event: PasteEvent) => {
            if (props.disabled) return
            const text = event.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
            if (text) {
              input.insertText(text)
              props.onChange(input.plainText)
            }
          }}
          onKeyDown={async (e) => {
            const keyName = e.name?.toLowerCase()

            // Manual paste fallbacks when bracketed paste doesn't work
            // Ctrl+Shift+V
            if (e.ctrl && e.shift && keyName === "v") {
              const clipboardText = await getClipboard()
              if (clipboardText) {
                input.insertText(clipboardText)
                props.onChange(input.plainText)
                e.preventDefault()
              }
              return
            }
            // Ctrl+V (try to handle directly)
            if (e.ctrl && keyName === "v") {
              const clipboardText = await getClipboard()
              if (clipboardText) {
                input.insertText(clipboardText)
                props.onChange(input.plainText)
                e.preventDefault()
              }
              return
            }
            // Ctrl+Y (yank in some editors)
            if (e.ctrl && keyName === "y") {
              const clipboardText = await getClipboard()
              if (clipboardText) {
                input.insertText(clipboardText)
                props.onChange(input.plainText)
                e.preventDefault()
              }
              return
            }
            // Cmd+V on macOS (meta key)
            if (e.meta && keyName === "v") {
              const clipboardText = await getClipboard()
              if (clipboardText) {
                input.insertText(clipboardText)
                props.onChange(input.plainText)
                e.preventDefault()
              }
              return
            }
            if (props.disabled) {
              e.preventDefault()
              return
            }

            // Command palette navigation
            if (showPalette() && props.onCommandPaletteIndexChange && props.commands) {
              if (e.name === "up") {
                props.onCommandPaletteIndexChange(
                  (props.commandPaletteIndex ?? 0) > 0 ? (props.commandPaletteIndex ?? 0) - 1 : props.commands.length - 1
                )
                e.preventDefault()
                return
              }
              if (e.name === "down") {
                props.onCommandPaletteIndexChange(
                  (props.commandPaletteIndex ?? 0) < props.commands.length - 1 ? (props.commandPaletteIndex ?? 0) + 1 : 0
                )
                e.preventDefault()
                return
              }
              // Tab copies command to input
              if (e.name === "tab") {
                const selected = props.commands[props.commandPaletteIndex ?? 0]
                if (selected) {
                  const newValue = `/${selected.name}${selected.args ? " " : ""}`
                  input.setText(newValue)
                  props.onChange(newValue)
                  input.cursorOffset = newValue.length
                }
                e.preventDefault()
                return
              }
              // Enter executes the command directly
              if (e.name === "return") {
                const selected = props.commands[props.commandPaletteIndex ?? 0]
                if (selected) {
                  const newValue = `/${selected.name}${selected.args ? " " : ""}`
                  input.setText(newValue)
                  props.onChange(newValue)
                  // Submit immediately if command doesn't need args
                  if (!selected.args) {
                    props.onSubmit(newValue)
                    input.clear()
                  } else {
                    input.cursorOffset = newValue.length
                  }
                }
                e.preventDefault()
                return
              }
            }

            // History navigation (only when palette not visible and at line boundaries)
            if (!showPalette()) {
              if (e.name === "up" && input.cursorOffset === 0) {
                if (history().length === 0) return
                if (historyIndex() === -1) {
                  savedInput = props.value
                }
                const newIndex = historyIndex() === -1 ? history().length - 1 : Math.max(0, historyIndex() - 1)
                setHistoryIndex(newIndex)
                const historyValue = history()[newIndex] || ""
                input.setText(historyValue)
                props.onChange(historyValue)
                e.preventDefault()
                return
              }
              if (e.name === "down" && input.cursorOffset === input.plainText.length) {
                if (historyIndex() === -1) return
                const newIndex = historyIndex() + 1
                if (newIndex >= history().length) {
                  setHistoryIndex(-1)
                  input.setText(savedInput)
                  props.onChange(savedInput)
                } else {
                  setHistoryIndex(newIndex)
                  const historyValue = history()[newIndex] || ""
                  input.setText(historyValue)
                  props.onChange(historyValue)
                }
                e.preventDefault()
                return
              }
            }
          }}
          onSubmit={submit}
          ref={(r: TextareaRenderable) => {
            input = r
          }}
          cursorColor={theme.primary}
          backgroundColor={theme.background}
          focusedBackgroundColor={theme.background}
        />
      </box>

      {/* Hint below input - always render to prevent layout shift */}
      <box paddingLeft={2} paddingTop={1}>
        <text fg={!props.disabled && !props.value ? theme.textMuted : theme.background}>? for shortcuts</text>
      </box>
    </box>
  )
}
