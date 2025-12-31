import { createSignal } from "solid-js"
import {
  getApiKey,
  saveApiKey,
  getAuthToken,
  saveAuthToken,
  getAuthMode,
  isAuthenticated as configIsAuthenticated,
  clearAuth,
  type AuthMode,
} from "../config"
import { validateToken } from "../auth"

export interface AuthState {
  isAuthenticated: boolean
  authMode: AuthMode | null
  isLoading: boolean
  error: string | null
}

export interface UseAuthReturn {
  state: AuthState
  signInWithApiKey: (key: string) => void
  signInWith10x: (token: string) => void
  signOut: () => void
  validateAuth: () => Promise<boolean>
  getCredentials: () => { apiKey: string | null; authToken: string | null }
}

/**
 * Hook for managing authentication state
 */
export function useAuth(apiUrl?: string): UseAuthReturn {
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = createSignal(configIsAuthenticated())
  const [authMode, setAuthMode] = createSignal<AuthMode | null>(getAuthMode())

  /**
   * Sign in with OpenRouter API key (BYOK mode)
   */
  const signInWithApiKey = (key: string) => {
    setError(null)
    saveApiKey(key)
    setAuthMode("byok")
    setIsAuthenticated(true)
  }

  /**
   * Sign in with 10x auth token
   */
  const signInWith10x = (token: string) => {
    setError(null)
    saveAuthToken(token)
    setAuthMode("10x")
    setIsAuthenticated(true)
  }

  /**
   * Sign out and clear all credentials
   */
  const signOut = () => {
    clearAuth()
    setAuthMode(null)
    setIsAuthenticated(false)
    setError(null)
  }

  /**
   * Validate current authentication
   */
  const validateAuth = async (): Promise<boolean> => {
    const mode = getAuthMode()

    if (!mode) {
      setIsAuthenticated(false)
      return false
    }

    if (mode === "byok") {
      // For BYOK, we just check if the key exists
      // Real validation happens on first API call
      const key = getApiKey()
      const valid = !!key
      setIsAuthenticated(valid)
      return valid
    }

    if (mode === "10x") {
      // For 10x auth, validate the token with the server
      const token = getAuthToken()
      if (!token) {
        setIsAuthenticated(false)
        return false
      }

      setIsLoading(true)
      try {
        const baseUrl = apiUrl || process.env.TENX_API_URL || "http://localhost:3000"
        const valid = await validateToken(baseUrl, token)
        setIsAuthenticated(valid)

        if (!valid) {
          setError("Session expired. Please sign in again.")
          clearAuth()
          setAuthMode(null)
        }

        return valid
      } catch (err) {
        // On network error, assume token is still valid
        // to allow offline usage
        return true
      } finally {
        setIsLoading(false)
      }
    }

    return false
  }

  /**
   * Get current credentials
   */
  const getCredentials = () => ({
    apiKey: getApiKey(),
    authToken: getAuthToken(),
  })

  return {
    state: {
      get isAuthenticated() {
        return isAuthenticated()
      },
      get authMode() {
        return authMode()
      },
      get isLoading() {
        return isLoading()
      },
      get error() {
        return error()
      },
    },
    signInWithApiKey,
    signInWith10x,
    signOut,
    validateAuth,
    getCredentials,
  }
}
