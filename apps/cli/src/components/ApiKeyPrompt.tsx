import { createSignal, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useTheme } from "../context"

interface ApiKeyPromptProps {
  onSubmit: (apiKey: string) => void
  onCancel: () => void
}

type AuthMode = "select" | "env_instructions" | "manual_entry"

export function ApiKeyPrompt(props: ApiKeyPromptProps) {
  const { theme } = useTheme()

  const [mode, setMode] = createSignal<AuthMode>("select")
  const [selectedOption, setSelectedOption] = createSignal(0)

  const options = [
    { key: "1", label: "Set OPENROUTER_API_KEY environment variable", description: "(Recommended)" },
    { key: "2", label: "Enter API key manually", description: "(Saved to ~/.config/10x/)" },
  ]

  useKeyboard((evt) => {
    const key = evt.name || ""

    if (mode() === "select") {
      if (key === "escape") {
        props.onCancel()
        return
      }

      if (key === "up") {
        setSelectedOption((prev) => (prev > 0 ? prev - 1 : options.length - 1))
        return
      }

      if (key === "down") {
        setSelectedOption((prev) => (prev < options.length - 1 ? prev + 1 : 0))
        return
      }

      if (key === "1") {
        setMode("env_instructions")
        return
      }

      if (key === "2") {
        setMode("manual_entry")
        return
      }

      if (key === "return") {
        if (selectedOption() === 0) {
          setMode("env_instructions")
        } else {
          setMode("manual_entry")
        }
        return
      }
    }

    if (mode() === "env_instructions") {
      if (key === "escape") {
        setMode("select")
        return
      }
    }
  })

  return (
    <box flexDirection="column" padding={2}>
      <Show when={mode() === "select"}>
        <AuthSelection
          options={options}
          selectedOption={selectedOption()}
          onSelect={(idx) => {
            if (idx === 0) setMode("env_instructions")
            else setMode("manual_entry")
          }}
        />
      </Show>

      <Show when={mode() === "env_instructions"}>
        <EnvInstructions onBack={() => setMode("select")} onCancel={props.onCancel} />
      </Show>

      <Show when={mode() === "manual_entry"}>
        <ManualEntry
          onSubmit={props.onSubmit}
          onBack={() => setMode("select")}
          onCancel={props.onCancel}
        />
      </Show>
    </box>
  )
}

function AuthSelection(props: {
  options: { key: string; label: string; description: string }[]
  selectedOption: number
  onSelect: (idx: number) => void
}) {
  const { theme } = useTheme()

  return (
    <box flexDirection="column">
      <box marginBottom={2}>
        <text>
          <span style={{ fg: theme.primary, bold: true }}>Authentication Required</span>
        </text>
      </box>

      <box marginBottom={1}>
        <text>
          <span style={{ fg: theme.text }}>10x uses OpenRouter for AI models. Choose how to authenticate:</span>
        </text>
      </box>

      <box flexDirection="column" marginBottom={2} marginTop={1}>
        {props.options.map((opt, idx) => (
          <box marginBottom={1}>
            <text>
              <span style={{ fg: props.selectedOption === idx ? theme.primary : theme.textMuted }}>
                {props.selectedOption === idx ? ">" : " "}
              </span>
              <span style={{ fg: theme.textMuted }}> [{opt.key}] </span>
              <span style={{ fg: props.selectedOption === idx ? theme.text : theme.textMuted, bold: props.selectedOption === idx }}>
                {opt.label}
              </span>
              <span style={{ fg: theme.textMuted }}> {opt.description}</span>
            </text>
          </box>
        ))}
      </box>

      <box>
        <text>
          <span style={{ fg: theme.textMuted }}>↑↓ Navigate • Enter Select • Esc Cancel</span>
        </text>
      </box>
    </box>
  )
}

function EnvInstructions(props: { onBack: () => void; onCancel: () => void }) {
  const { theme } = useTheme()

  useKeyboard((evt) => {
    if (evt.name === "escape") {
      props.onBack()
    }
  })

  return (
    <box flexDirection="column">
      <box marginBottom={2}>
        <text>
          <span style={{ fg: theme.primary, bold: true }}>Set Environment Variable</span>
        </text>
      </box>

      <box flexDirection="column" marginBottom={2}>
        <text>
          <span style={{ fg: theme.text }}>1. Get your API key from: </span>
          <span style={{ fg: theme.info, underline: true }}>https://openrouter.ai/keys</span>
        </text>
      </box>

      <box flexDirection="column" marginBottom={2}>
        <text>
          <span style={{ fg: theme.text }}>2. Add to your shell profile (~/.zshrc or ~/.bashrc):</span>
        </text>
        <box marginTop={1} marginLeft={3}>
          <text>
            <span style={{ fg: theme.syntaxString }}>export OPENROUTER_API_KEY="sk-or-v1-..."</span>
          </text>
        </box>
      </box>

      <box flexDirection="column" marginBottom={2}>
        <text>
          <span style={{ fg: theme.text }}>3. Reload your shell or run:</span>
        </text>
        <box marginTop={1} marginLeft={3}>
          <text>
            <span style={{ fg: theme.syntaxString }}>source ~/.zshrc</span>
          </text>
        </box>
      </box>

      <box flexDirection="column" marginBottom={2}>
        <text>
          <span style={{ fg: theme.text }}>4. Run 10x again:</span>
        </text>
        <box marginTop={1} marginLeft={3}>
          <text>
            <span style={{ fg: theme.syntaxString }}>10x</span>
          </text>
        </box>
      </box>

      <box marginTop={1}>
        <text>
          <span style={{ fg: theme.textMuted }}>Esc Go back</span>
        </text>
      </box>
    </box>
  )
}

function ManualEntry(props: { onSubmit: (key: string) => void; onBack: () => void; onCancel: () => void }) {
  const { theme } = useTheme()

  const [apiKey, setApiKey] = createSignal("")
  const [showKey, setShowKey] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [validating, setValidating] = createSignal(false)

  const handleSubmit = async () => {
    const key = apiKey().trim()
    if (!key) return

    if (!key.startsWith("sk-or-") && !key.startsWith("sk-")) {
      setError("Invalid key format. OpenRouter keys start with sk-or-")
      return
    }

    if (key.length < 20) {
      setError("API key is too short")
      return
    }

    setValidating(true)
    setError(null)

    // Quick validation - just check format, real validation happens on first request
    setTimeout(() => {
      setValidating(false)
      props.onSubmit(key)
    }, 300)
  }

  useKeyboard((evt) => {
    if (validating()) return

    const key = evt.name || ""
    const isCtrl = evt.ctrl ?? false
    const isMeta = evt.meta ?? false

    if (key === "escape") {
      props.onBack()
      return
    }

    if (key === "return") {
      handleSubmit()
      return
    }

    if (key === "backspace" || key === "delete") {
      setApiKey((prev) => prev.slice(0, -1))
      setError(null)
      return
    }

    if (isCtrl && key === "v") {
      setShowKey((prev) => !prev)
      return
    }

    if (key && key.length === 1 && !isCtrl && !isMeta) {
      setApiKey((prev) => prev + key)
      setError(null)
    }
  })

  const maskedKey = () => (showKey() ? apiKey() : apiKey().replace(/./g, "•"))

  return (
    <box flexDirection="column">
      <box marginBottom={2}>
        <text>
          <span style={{ fg: theme.primary, bold: true }}>Enter API Key</span>
        </text>
      </box>

      <box marginBottom={1}>
        <text>
          <span style={{ fg: theme.textMuted }}>Get your key from: </span>
          <span style={{ fg: theme.info, underline: true }}>https://openrouter.ai/keys</span>
        </text>
      </box>

      <box marginBottom={1} marginTop={1}>
        <text>
          <span style={{ fg: theme.text }}>API Key: </span>
          <Show when={apiKey()} fallback={<span style={{ fg: theme.textMuted }}>sk-or-...</span>}>
            <span style={{ fg: theme.text }}>{maskedKey()}</span>
          </Show>
          <Show when={!validating()}>
            <span style={{ fg: theme.primary }}>█</span>
          </Show>
        </text>
      </box>

      <Show when={validating()}>
        <box marginBottom={1}>
          <text>
            <span style={{ fg: theme.info }}>Validating...</span>
          </text>
        </box>
      </Show>

      <Show when={error()}>
        <box marginBottom={1}>
          <text>
            <span style={{ fg: theme.error }}>✗ {error()}</span>
          </text>
        </box>
      </Show>

      <box marginTop={1}>
        <text>
          <span style={{ fg: theme.textMuted }}>Enter Submit • Esc Back • Ctrl+V Toggle visibility</span>
        </text>
      </box>

      <box marginTop={2}>
        <text>
          <span style={{ fg: theme.warning }}>Note: </span>
          <span style={{ fg: theme.textMuted }}>Key will be saved to ~/.config/10x/config.json</span>
        </text>
      </box>
    </box>
  )
}
