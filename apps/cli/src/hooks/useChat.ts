import { createSignal, createEffect } from "solid-js"
import {
  OpenRouterClient,
  Router,
  createCoreToolRegistry,
  PermissionManager,
} from "@10x/core"
import type { Message, ModelTier, RoutingMode, ChatMessage, ToolCall, ContentPart } from "@10x/shared"
import type { AuthMode } from "../config"

// 10x API proxy URL
const TEN_X_API_URL = process.env.TEN_X_API_URL || 'https://10x.dev/api/v1';

interface UseChatOptions {
  apiKey?: string        // OpenRouter API key (BYOK mode)
  authToken?: string     // 10x API token (10x auth mode)
  authMode?: AuthMode    // Which auth mode is active
  defaultTier?: ModelTier
  routingMode?: RoutingMode
  systemPrompt?: string
  enableTools?: boolean
  permissionManager?: PermissionManager
}

interface UseChatReturn {
  messages: Message[]
  isStreaming: boolean
  error: string | null
  usageLimitExceeded: boolean    // True when 10x auth mode usage limit is exceeded
  tokenUsage: { input: number; output: number }
  currentTier: ModelTier
  activeToolCalls: ToolCall[]
  sendMessage: (content: string | ContentPart[], tier?: ModelTier) => Promise<void>
  clearMessages: () => void
  clearError: () => void
  cancel: () => void  // Cancel the current streaming operation
}

export function useChat({
  apiKey,
  authToken,
  authMode,
  defaultTier = "smart",
  routingMode = "auto",
  systemPrompt,
  enableTools = true,
  permissionManager,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = createSignal<Message[]>([])
  const [isStreaming, setIsStreaming] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [usageLimitExceeded, setUsageLimitExceeded] = createSignal(false)
  const [tokenUsage, setTokenUsage] = createSignal({ input: 0, output: 0 })
  const [currentTier, setCurrentTier] = createSignal<ModelTier>(defaultTier)
  const [activeToolCalls, setActiveToolCalls] = createSignal<ToolCall[]>([])

  // Keep router instance stable
  let router: Router | null = null
  let tools: ReturnType<typeof createCoreToolRegistry> | null = null

  // Abort controller for cancellation
  let abortController: AbortController | null = null

  const getRouter = () => {
    if (!router) {
      // Configure client based on auth mode
      let client: OpenRouterClient
      if (authMode === '10x' && authToken) {
        // 10x auth mode: use our API proxy
        client = new OpenRouterClient({
          apiKey: authToken,
          baseURL: TEN_X_API_URL,
        })
      } else {
        // BYOK mode: use OpenRouter directly
        client = new OpenRouterClient({ apiKey: apiKey || '' })
      }

      if (enableTools) {
        tools = createCoreToolRegistry()
        if (permissionManager) {
          tools.setPermissionManager(permissionManager)
        }
      }
      router = new Router({
        client,
        tools: tools ?? undefined,
        defaultTier,
        systemPrompt,
      })
    }
    return router
  }

  // Update permission manager if it changes
  createEffect(() => {
    if (tools && permissionManager) {
      tools.setPermissionManager(permissionManager)
    }
  })

  const sendMessage = async (content: string | ContentPart[], forceTier?: ModelTier) => {
    const isEmpty = typeof content === "string" ? !content.trim() : content.length === 0
    if (isEmpty) return

    const hasImages = Array.isArray(content) && content.some((part) => part.type === "image_url")

    const displayContent =
      typeof content === "string"
        ? content
        : content
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("\n")

    const userMessage: Message = {
      role: "user",
      content: displayContent,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsStreaming(true)
    setError(null)
    setActiveToolCalls([])

    // Create new abort controller for this request
    abortController = new AbortController()
    const signal = abortController.signal

    try {
      const routerInstance = getRouter()

      const chatMessages: ChatMessage[] = messages().map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }))
      chatMessages.push({ role: "user", content })

      let tier: ModelTier | undefined = forceTier
      if (!tier && hasImages) {
        tier = "smart"
      } else if (!tier && routingMode !== "auto") {
        tier = routingMode
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
        toolCalls: [],
      }

      setMessages((prev) => [...prev, assistantMessage])

      let fullContent = ""
      let responseTier: ModelTier = tier ?? defaultTier
      const collectedToolCalls: ToolCall[] = []

      for await (const event of routerInstance.stream(chatMessages, tier, hasImages, signal)) {
        responseTier = event.tier ?? responseTier
        setCurrentTier(responseTier)

        if (event.type === "text" && event.content) {
          fullContent += event.content

          setMessages((prev) => {
            const updated = [...prev]
            const lastIndex = updated.length - 1
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: fullContent,
              modelTier: responseTier,
            }
            return updated
          })
        }

        if (event.type === "tool_call" && event.toolCall) {
          collectedToolCalls.push(event.toolCall)
          setActiveToolCalls([...collectedToolCalls])

          setMessages((prev) => {
            const updated = [...prev]
            const lastIndex = updated.length - 1
            updated[lastIndex] = {
              ...updated[lastIndex],
              toolCalls: [...collectedToolCalls],
            }
            return updated
          })
        }

        if (event.type === "tool_result" && event.toolCall) {
          const idx = collectedToolCalls.findIndex((tc) => tc.id === event.toolCall!.id)
          if (idx >= 0) {
            collectedToolCalls[idx] = event.toolCall
            setActiveToolCalls([...collectedToolCalls])

            setMessages((prev) => {
              const updated = [...prev]
              const lastIndex = updated.length - 1
              updated[lastIndex] = {
                ...updated[lastIndex],
                toolCalls: [...collectedToolCalls],
              }
              return updated
            })
          }
        }

        if (event.type === "done") {
          break
        }
      }

      setMessages((prev) => {
        const updated = [...prev]
        const lastIndex = updated.length - 1
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: fullContent,
          modelTier: responseTier,
          toolCalls: collectedToolCalls,
        }
        return updated
      })

      setActiveToolCalls([])
    } catch (err) {
      // Handle abort/cancellation - not an error, just cleanup
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Keep partial content if any, just mark the message as incomplete
        setMessages((prev) => {
          const updated = [...prev]
          const lastIndex = updated.length - 1
          if (updated[lastIndex]?.role === "assistant") {
            // Keep the message with whatever content we have
            if (!updated[lastIndex].content) {
              // If no content yet, add a cancelled indicator
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: "(cancelled)",
              }
            }
          }
          return updated
        })
        // Don't set error for cancellation
        return
      }

      let errorMessage = err instanceof Error ? err.message : "An error occurred"

      // Check for 402 usage limit exceeded error (10x auth mode)
      if (err instanceof Error && (
        errorMessage.includes('402') ||
        errorMessage.includes('usage_limit_exceeded') ||
        errorMessage.includes('Monthly token limit exceeded')
      )) {
        setUsageLimitExceeded(true)
        errorMessage = 'Monthly token limit exceeded. Please upgrade your plan at 10x.dev/billing'
      }

      setError(errorMessage)

      setMessages((prev) => {
        if (prev[prev.length - 1]?.role === "assistant" && !prev[prev.length - 1]?.content) {
          return prev.slice(0, -1)
        }
        return prev
      })
    } finally {
      setIsStreaming(false)
      setActiveToolCalls([])
      abortController = null
    }
  }

  const cancel = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const clearMessages = () => {
    setMessages([])
    setTokenUsage({ input: 0, output: 0 })
    setError(null)
    setActiveToolCalls([])
  }

  const clearError = () => {
    setError(null)
  }

  return {
    get messages() {
      return messages()
    },
    get isStreaming() {
      return isStreaming()
    },
    get error() {
      return error()
    },
    get usageLimitExceeded() {
      return usageLimitExceeded()
    },
    get tokenUsage() {
      return tokenUsage()
    },
    get currentTier() {
      return currentTier()
    },
    get activeToolCalls() {
      return activeToolCalls()
    },
    sendMessage,
    clearMessages,
    clearError,
    cancel,
  }
}
