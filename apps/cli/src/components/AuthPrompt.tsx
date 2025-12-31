import { createSignal, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useTheme } from "../context"

interface AuthPromptProps {
  onSelectWebAuth: () => void
  onSubmitApiKey: (apiKey: string) => void
  onCancel: () => void
}

type AuthMode = "select" | "manual_entry"

export function AuthPrompt(props: AuthPromptProps) {
  const { theme } = useTheme()

  const [mode, setMode] = createSignal<AuthMode>("select")
  const [selectedOption, setSelectedOption] = createSignal(0)

  const options = [
    {
      key: "1",
      label: "Sign in with 10x",
      description: "Free tier includes 100k tokens/month",
      recommended: true,
    },
    {
      key: "2",
      label: "Use your own API key",
      description: "Bring your own OpenRouter API key",
      recommended: false,
    },
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
        props.onSelectWebAuth()
        return
      }

      if (key === "2") {
        setMode("manual_entry")
        return
      }

      if (key === "return") {
        if (selectedOption() === 0) {
          props.onSelectWebAuth()
        } else {
          setMode("manual_entry")
        }
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
            if (idx === 0) props.onSelectWebAuth()
            else setMode("manual_entry")
          }}
        />
      </Show>

      <Show when={mode() === "manual_entry"}>
        <ManualEntry
          onSubmit={props.onSubmitApiKey}
          onBack={() => setMode("select")}
          onCancel={props.onCancel}
        />
      </Show>
    </box>
  )
}

function AuthSelection(props: {
  options: { key: string; label: string; description: string; recommended: boolean }[]
  selectedOption: number
  onSelect: (idx: number) => void
}) {
  const { theme } = useTheme()

  return (
    <box flexDirection="column">
      <box marginBottom={2}>
        <text>
          <span style={{ fg: theme.primary, bold: true }}>Welcome to 10x</span>
        </text>
      </box>

      <box marginBottom={1}>
        <text>
          <span style={{ fg: theme.text }}>How would you like to authenticate?</span>
        </text>
      </box>

      <box flexDirection="column" marginBottom={2} marginTop={1}>
        {props.options.map((opt, idx) => (
          <box flexDirection="column" marginBottom={1}>
            <box>
              <text>
                <span style={{ fg: props.selectedOption === idx ? theme.primary : theme.textMuted }}>
                  {props.selectedOption === idx ? ">" : " "}
                </span>
                <span style={{ fg: theme.textMuted }}> [{opt.key}] </span>
                <span
                  style={{
                    fg: props.selectedOption === idx ? theme.text : theme.textMuted,
                    bold: props.selectedOption === idx,
                  }}
                >
                  {opt.label}
                </span>
                <Show when={opt.recommended}>
                  <span style={{ fg: theme.success }}> (recommended)</span>
                </Show>
              </text>
            </box>
            <box marginLeft={7}>
              <text>
                <span style={{ fg: theme.textMuted }}>{opt.description}</span>
              </text>
            </box>
          </box>
        ))}
      </box>

      <box>
        <text>
          <span style={{ fg: theme.textMuted }}>Up/Down Navigate | Enter Select | Esc Cancel</span>
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

  const maskedKey = () => (showKey() ? apiKey() : apiKey().replace(/./g, "*"))

  return (
    <box flexDirection="column">
      <box marginBottom={2}>
        <text>
          <span style={{ fg: theme.primary, bold: true }}>Enter OpenRouter API Key</span>
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
            <span style={{ fg: theme.primary }}>|</span>
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
            <span style={{ fg: theme.error }}>x {error()}</span>
          </text>
        </box>
      </Show>

      <box marginTop={1}>
        <text>
          <span style={{ fg: theme.textMuted }}>Enter Submit | Esc Back | Ctrl+V Toggle visibility</span>
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
