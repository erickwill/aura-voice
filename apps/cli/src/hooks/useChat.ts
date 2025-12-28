import { useState, useCallback, useRef, useEffect } from 'react';
import {
  OpenRouterClient,
  Router,
  createCoreToolRegistry,
  PermissionManager,
} from '@10x/core';
import type { Message, ModelTier, ChatMessage, ToolCall, ContentPart } from '@10x/shared';

interface UseChatOptions {
  apiKey: string;
  defaultTier?: ModelTier;
  systemPrompt?: string;
  enableTools?: boolean;
  permissionManager?: PermissionManager;
}

interface UseChatReturn {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  tokenUsage: { input: number; output: number };
  currentTier: ModelTier;
  activeToolCalls: ToolCall[];
  sendMessage: (content: string | ContentPart[], tier?: ModelTier) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

export function useChat({
  apiKey,
  defaultTier = 'smart',
  systemPrompt,
  enableTools = true,
  permissionManager,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 });
  const [currentTier, setCurrentTier] = useState<ModelTier>(defaultTier);
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([]);

  // Keep router instance stable
  const routerRef = useRef<Router | null>(null);
  const toolsRef = useRef<ReturnType<typeof createCoreToolRegistry> | null>(null);

  const getRouter = useCallback(() => {
    if (!routerRef.current) {
      const client = new OpenRouterClient({ apiKey });
      let tools = undefined;
      if (enableTools) {
        tools = createCoreToolRegistry();
        toolsRef.current = tools;
        // Set permission manager on the tools registry
        if (permissionManager) {
          tools.setPermissionManager(permissionManager);
        }
      }
      routerRef.current = new Router({
        client,
        tools,
        defaultTier,
        systemPrompt,
      });
    }
    return routerRef.current;
  }, [apiKey, defaultTier, systemPrompt, enableTools, permissionManager]);

  // Update permission manager if it changes
  useEffect(() => {
    if (toolsRef.current && permissionManager) {
      toolsRef.current.setPermissionManager(permissionManager);
    }
  }, [permissionManager]);

  const sendMessage = useCallback(
    async (content: string | ContentPart[], forceTier?: ModelTier) => {
      // Check if content is empty
      const isEmpty = typeof content === 'string'
        ? !content.trim()
        : content.length === 0;
      if (isEmpty) return;

      // Determine if this is a multimodal message
      const hasImages = Array.isArray(content) && content.some(part => part.type === 'image_url');

      // For display, extract text content
      const displayContent = typeof content === 'string'
        ? content
        : content.filter(p => p.type === 'text').map(p => (p as { text: string }).text).join('\n');

      // Add user message
      const userMessage: Message = {
        role: 'user',
        content: displayContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setError(null);
      setActiveToolCalls([]);

      try {
        const router = getRouter();

        // Build chat messages for API
        const chatMessages: ChatMessage[] = messages.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        }));
        chatMessages.push({ role: 'user', content });

        // Use vision model for images
        const tier = hasImages ? 'smart' : forceTier;

        // Start with empty assistant message
        const assistantMessage: Message = {
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          toolCalls: [],
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Stream the response
        let fullContent = '';
        let responseTier: ModelTier = tier ?? defaultTier;
        const collectedToolCalls: ToolCall[] = [];

        for await (const event of router.stream(chatMessages, tier, hasImages)) {
          responseTier = event.tier ?? responseTier;
          setCurrentTier(responseTier);

          if (event.type === 'text' && event.content) {
            fullContent += event.content;

            // Update the last message with accumulated content
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: fullContent,
                modelTier: responseTier,
              };
              return updated;
            });
          }

          if (event.type === 'tool_call' && event.toolCall) {
            collectedToolCalls.push(event.toolCall);
            setActiveToolCalls([...collectedToolCalls]);

            // Update message with tool calls
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              updated[lastIndex] = {
                ...updated[lastIndex],
                toolCalls: [...collectedToolCalls],
              };
              return updated;
            });
          }

          if (event.type === 'tool_result' && event.toolCall) {
            // Update the specific tool call with its result
            const idx = collectedToolCalls.findIndex(
              (tc) => tc.id === event.toolCall!.id
            );
            if (idx >= 0) {
              collectedToolCalls[idx] = event.toolCall;
              setActiveToolCalls([...collectedToolCalls]);

              setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  toolCalls: [...collectedToolCalls],
                };
                return updated;
              });
            }
          }

          if (event.type === 'done') {
            break;
          }
        }

        // Finalize the message
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: fullContent,
            modelTier: responseTier,
            toolCalls: collectedToolCalls,
          };
          return updated;
        });

        setActiveToolCalls([]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);

        // Remove the empty assistant message on error
        setMessages((prev) => {
          if (
            prev[prev.length - 1]?.role === 'assistant' &&
            !prev[prev.length - 1]?.content
          ) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } finally {
        setIsStreaming(false);
        setActiveToolCalls([]);
      }
    },
    [messages, getRouter, defaultTier]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTokenUsage({ input: 0, output: 0 });
    setError(null);
    setActiveToolCalls([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isStreaming,
    error,
    tokenUsage,
    currentTier,
    activeToolCalls,
    sendMessage,
    clearMessages,
    clearError,
  };
}
