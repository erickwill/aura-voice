import { createSignal, createEffect, onCleanup, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useTheme } from "../context"
import { getApiUrl } from "../config"
import {
  requestDeviceCode,
  createCancellablePolling,
  formatUserCode,
  DeviceAuthError,
  type DeviceCodeResponse,
} from "../auth"

interface DeviceAuthFlowProps {
  apiUrl?: string
  onSuccess: (token: string) => void
  onCancel: () => void
  onError: (error: string) => void
}

type FlowState = "loading" | "showing_code" | "polling" | "success" | "error"

export function DeviceAuthFlow(props: DeviceAuthFlowProps) {
  const { theme } = useTheme()
  const apiUrl = () => props.apiUrl || getApiUrl()

  const [state, setState] = createSignal<FlowState>("loading")
  const [deviceCode, setDeviceCode] = createSignal<DeviceCodeResponse | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const [timeRemaining, setTimeRemaining] = createSignal(0)

  let cancelPolling: (() => void) | null = null
  let countdownInterval: ReturnType<typeof setInterval> | null = null

  // Request device code on mount
  createEffect(() => {
    const initFlow = async () => {
      try {
        setState("loading")
        const code = await requestDeviceCode(apiUrl())
        setDeviceCode(code)
        setTimeRemaining(code.expiresIn)
        setState("showing_code")

        // Start countdown timer
        countdownInterval = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              if (countdownInterval) clearInterval(countdownInterval)
              setState("error")
              setError("Device code expired. Press Enter to try again.")
              return 0
            }
            return prev - 1
          })
        }, 1000)

        // Start polling
        setState("polling")
        const polling = createCancellablePolling(apiUrl(), code.deviceCode, code.interval)
        cancelPolling = polling.cancel

        const result = await polling.promise
        setState("success")

        // Small delay to show success state
        setTimeout(() => {
          props.onSuccess(result.accessToken)
        }, 500)
      } catch (err) {
        if (err instanceof DeviceAuthError) {
          if (err.code === "access_denied" && err.message.includes("cancelled")) {
            // User cancelled, don't show error
            return
          }
          setError(err.message)
        } else {
          setError(err instanceof Error ? err.message : "Unknown error occurred")
        }
        setState("error")
      }
    }

    initFlow()
  })

  // Cleanup on unmount
  onCleanup(() => {
    cancelPolling?.()
    if (countdownInterval) clearInterval(countdownInterval)
  })

  // Keyboard handling
  useKeyboard((evt) => {
    if (evt.name === "escape") {
      cancelPolling?.()
      if (countdownInterval) clearInterval(countdownInterval)
      props.onCancel()
      return
    }

    if (evt.name === "return") {
      // Open browser (if supported)
      const code = deviceCode()
      if (code && (state() === "showing_code" || state() === "polling")) {
        try {
          const url = code.verificationUrl
          // Use open command based on platform
          const { exec } = require("child_process")
          const platform = process.platform
          const cmd =
            platform === "darwin" ? `open "${url}"` : platform === "win32" ? `start "${url}"` : `xdg-open "${url}"`
          exec(cmd)
        } catch {
          // Ignore errors opening browser
        }
      }

      // Retry on error
      if (state() === "error") {
        setError(null)
        setState("loading")
        // Re-trigger effect by toggling a value
        const initFlow = async () => {
          try {
            const code = await requestDeviceCode(apiUrl())
            setDeviceCode(code)
            setTimeRemaining(code.expiresIn)
            setState("polling")

            countdownInterval = setInterval(() => {
              setTimeRemaining((prev) => {
                if (prev <= 1) {
                  if (countdownInterval) clearInterval(countdownInterval)
                  setState("error")
                  setError("Device code expired. Press Enter to try again.")
                  return 0
                }
                return prev - 1
              })
            }, 1000)

            const polling = createCancellablePolling(apiUrl(), code.deviceCode, code.interval)
            cancelPolling = polling.cancel

            const result = await polling.promise
            setState("success")
            setTimeout(() => props.onSuccess(result.accessToken), 500)
          } catch (err) {
            if (err instanceof DeviceAuthError && err.code === "access_denied") return
            setError(err instanceof Error ? err.message : "Unknown error")
            setState("error")
          }
        }
        initFlow()
      }
    }
  })

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <box flexDirection="column" padding={2}>
      {/* Title */}
      <box marginBottom={2}>
        <text>
          <span style={{ fg: theme.primary, bold: true }}>Sign in to 10x</span>
        </text>
      </box>

      {/* Loading state */}
      <Show when={state() === "loading"}>
        <box>
          <text>
            <span style={{ fg: theme.info }}>Requesting device code...</span>
          </text>
        </box>
      </Show>

      {/* Showing code / Polling state */}
      <Show when={state() === "showing_code" || state() === "polling"}>
        <box flexDirection="column">
          {/* Step 1 */}
          <box marginBottom={1}>
            <text>
              <span style={{ fg: theme.text }}>1. Open this URL in your browser:</span>
            </text>
          </box>
          <box marginBottom={2} marginLeft={3}>
            <text>
              <span style={{ fg: theme.info, underline: true }}>{deviceCode()?.verificationUrl}</span>
            </text>
          </box>

          {/* Step 2 */}
          <box marginBottom={1}>
            <text>
              <span style={{ fg: theme.text }}>2. Enter this code:</span>
            </text>
          </box>

          {/* Code display box */}
          <box marginBottom={2} marginLeft={3}>
            <box
              borderStyle="round"
              borderColor={theme.primary}
              paddingLeft={3}
              paddingRight={3}
              paddingTop={1}
              paddingBottom={1}
            >
              <text>
                <span style={{ fg: theme.primary, bold: true }}>
                  {"  "}{formatUserCode(deviceCode()?.userCode || "")}{"  "}
                </span>
              </text>
            </box>
          </box>

          {/* Status */}
          <box marginBottom={1}>
            <text>
              <span style={{ fg: theme.textMuted }}>
                {state() === "polling" ? "● " : "○ "}
                Waiting for confirmation...
              </span>
              <span style={{ fg: theme.textMuted }}> (expires in {formatTime(timeRemaining())})</span>
            </text>
          </box>

          {/* Instructions */}
          <box marginTop={2}>
            <text>
              <span style={{ fg: theme.textMuted }}>Enter Open browser | Esc Cancel</span>
            </text>
          </box>
        </box>
      </Show>

      {/* Success state */}
      <Show when={state() === "success"}>
        <box flexDirection="column">
          <box marginBottom={1}>
            <text>
              <span style={{ fg: theme.success, bold: true }}>✓ Authentication successful!</span>
            </text>
          </box>
          <box>
            <text>
              <span style={{ fg: theme.textMuted }}>Starting 10x...</span>
            </text>
          </box>
        </box>
      </Show>

      {/* Error state */}
      <Show when={state() === "error"}>
        <box flexDirection="column">
          <box marginBottom={1}>
            <text>
              <span style={{ fg: theme.error, bold: true }}>✗ Authentication failed</span>
            </text>
          </box>
          <box marginBottom={2}>
            <text>
              <span style={{ fg: theme.error }}>{error()}</span>
            </text>
          </box>
          <box>
            <text>
              <span style={{ fg: theme.textMuted }}>Enter Try again | Esc Go back</span>
            </text>
          </box>
        </box>
      </Show>
    </box>
  )
}
