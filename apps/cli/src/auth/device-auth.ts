/**
 * Device Authorization Flow for 10x CLI
 *
 * Implements OAuth 2.0 Device Authorization Grant (RFC 8628)
 * for authenticating CLI users via browser.
 */

export interface DeviceCodeResponse {
  deviceCode: string
  userCode: string
  verificationUrl: string
  expiresIn: number
  interval: number
}

export interface TokenResponse {
  accessToken: string
  expiresAt: number | null
}

export type PollError =
  | "authorization_pending"
  | "slow_down"
  | "expired_token"
  | "access_denied"
  | "invalid_code"

export interface PollErrorResponse {
  error: PollError
  message: string
}

export class DeviceAuthError extends Error {
  constructor(
    public code: PollError | "network_error" | "unknown_error",
    message: string
  ) {
    super(message)
    this.name = "DeviceAuthError"
  }
}

const DEFAULT_API_URL = process.env.TENX_API_URL || "http://localhost:3000"

/**
 * Request a new device code from the server
 */
export async function requestDeviceCode(
  apiUrl: string = DEFAULT_API_URL
): Promise<DeviceCodeResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/auth/device`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new DeviceAuthError(
        "unknown_error",
        error.message || `Failed to request device code: ${response.status}`
      )
    }

    const data = await response.json()

    return {
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUrl: data.verification_uri || `${apiUrl}/auth/device`,
      expiresIn: data.expires_in || 900, // 15 minutes default
      interval: data.interval || 5, // 5 seconds default
    }
  } catch (error) {
    if (error instanceof DeviceAuthError) {
      throw error
    }
    throw new DeviceAuthError(
      "network_error",
      `Failed to connect to server: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Poll for token after user confirms device code
 *
 * @returns TokenResponse if successful
 * @throws DeviceAuthError if polling fails or times out
 */
export async function pollForToken(
  apiUrl: string = DEFAULT_API_URL,
  deviceCode: string,
  interval: number = 5,
  maxAttempts: number = 180 // 15 minutes at 5s intervals
): Promise<TokenResponse> {
  let attempts = 0
  let currentInterval = interval * 1000 // Convert to milliseconds

  while (attempts < maxAttempts) {
    attempts++

    // Wait before polling
    await sleep(currentInterval)

    try {
      const response = await fetch(`${apiUrl}/api/auth/device/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deviceCode }),
      })

      const data = await response.json()

      if (response.ok && data.accessToken) {
        return {
          accessToken: data.accessToken,
          expiresAt: data.expiresAt || null,
        }
      }

      // Handle specific error codes
      if (data.error) {
        switch (data.error as PollError) {
          case "authorization_pending":
            // User hasn't confirmed yet, continue polling
            continue

          case "slow_down":
            // Increase interval by 5 seconds
            currentInterval += 5000
            continue

          case "expired_token":
            throw new DeviceAuthError("expired_token", "Device code has expired. Please try again.")

          case "access_denied":
            throw new DeviceAuthError("access_denied", "Authorization was denied.")

          case "invalid_code":
            throw new DeviceAuthError("invalid_code", "Invalid device code.")

          default:
            throw new DeviceAuthError("unknown_error", data.message || "Unknown error")
        }
      }
    } catch (error) {
      if (error instanceof DeviceAuthError) {
        throw error
      }
      // Network errors - continue polling
      console.error("Poll error:", error)
    }
  }

  throw new DeviceAuthError("expired_token", "Polling timed out. Please try again.")
}

/**
 * Validate an existing API token
 */
export async function validateToken(
  apiUrl: string = DEFAULT_API_URL,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/api/auth/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    return response.ok
  } catch {
    return false
  }
}

/**
 * Format user code for display (e.g., "ABCD1234" -> "ABCD-1234")
 */
export function formatUserCode(code: string): string {
  if (code.length === 8 && !code.includes("-")) {
    return `${code.slice(0, 4)}-${code.slice(4)}`
  }
  return code
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create a cancellable polling operation
 */
export function createCancellablePolling(
  apiUrl: string,
  deviceCode: string,
  interval: number
): {
  promise: Promise<TokenResponse>
  cancel: () => void
} {
  let cancelled = false
  let rejectFn: (reason: Error) => void

  const promise = new Promise<TokenResponse>((resolve, reject) => {
    rejectFn = reject

    const poll = async () => {
      let attempts = 0
      let currentInterval = interval * 1000
      const maxAttempts = 180

      while (!cancelled && attempts < maxAttempts) {
        attempts++

        await sleep(currentInterval)

        if (cancelled) {
          reject(new DeviceAuthError("access_denied", "Authentication cancelled"))
          return
        }

        try {
          const response = await fetch(`${apiUrl}/api/auth/device/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ deviceCode }),
          })

          const data = await response.json()

          if (response.ok && data.accessToken) {
            resolve({
              accessToken: data.accessToken,
              expiresAt: data.expiresAt || null,
            })
            return
          }

          if (data.error) {
            switch (data.error as PollError) {
              case "authorization_pending":
                continue
              case "slow_down":
                currentInterval += 5000
                continue
              case "expired_token":
                reject(new DeviceAuthError("expired_token", "Device code has expired."))
                return
              case "access_denied":
                reject(new DeviceAuthError("access_denied", "Authorization was denied."))
                return
              case "invalid_code":
                reject(new DeviceAuthError("invalid_code", "Invalid device code."))
                return
            }
          }
        } catch (error) {
          if (error instanceof DeviceAuthError) {
            reject(error)
            return
          }
          // Continue on network errors
        }
      }

      if (!cancelled) {
        reject(new DeviceAuthError("expired_token", "Polling timed out."))
      }
    }

    poll()
  })

  return {
    promise,
    cancel: () => {
      cancelled = true
      rejectFn?.(new DeviceAuthError("access_denied", "Authentication cancelled"))
    },
  }
}
