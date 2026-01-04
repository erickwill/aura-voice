#!/usr/bin/env bun
import { render, useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { Command } from "commander"
import { App } from "./components/App"
import { getApiKey } from "./config"
import { ExitProvider, ThemeProvider, KeybindProvider } from "./context"
import {
  OpenRouterClient,
  Router,
  createCoreToolRegistry,
  buildFullSystemPrompt,
  buildSkillsPromptSection,
} from "@10x/core"
import type { ModelTier } from "@10x/shared"
import { ErrorBoundary } from "solid-js"

const program = new Command()

program
  .name("10x")
  .description("AI coding assistant — code at 10x speed")
  .version("0.1.0")
  .option("--byok", "Use your own OpenRouter API key")
  .option("-m, --model <tier>", "Model tier: superfast, fast, or smart", "smart")
  .option("-r, --resume <name>", "Resume a named session")
  .option("-c, --continue", "Continue the last session")
  .option("-x, --execute <prompt>", "Execute a single prompt and exit")
  .option("-q, --quiet", "Suppress status output in execute mode")
  .parse()

const options = program.opts()

/**
 * Execute a single prompt and exit (non-interactive mode)
 */
async function executeMode(prompt: string, modelTier: ModelTier, quiet: boolean): Promise<void> {
  const apiKey = getApiKey()

  if (!apiKey) {
    console.error("Error: No API key configured.")
    console.error(
      "Run 10x interactively first to set up your API key, or set OPENROUTER_API_KEY environment variable."
    )
    process.exit(1)
  }

  // Check for piped input
  let fullPrompt = prompt
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) {
      chunks.push(chunk)
    }
    const stdinContent = Buffer.concat(chunks).toString("utf-8").trim()
    if (stdinContent) {
      fullPrompt = `${prompt}\n\n<stdin>\n${stdinContent}\n</stdin>`
    }
  }

  // Build system prompt
  const basePrompt = `You are 10x, a fast and helpful AI coding assistant. Be concise and direct. You have access to tools for reading, writing, and editing files, searching with glob and grep, and running bash commands.`
  const skillsSection = buildSkillsPromptSection()
  const systemPrompt = buildFullSystemPrompt(basePrompt, skillsSection)

  // Create router with tools
  const client = new OpenRouterClient({ apiKey })
  const tools = createCoreToolRegistry()
  const router = new Router({
    client,
    aiProviderConfig: {
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    },
    tools,
    defaultTier: modelTier,
    systemPrompt,
  })

  if (!quiet) {
    process.stderr.write(`[10x] Model: ${modelTier}\n`)
  }

  try {
    // Stream the response
    for await (const event of router.stream([{ role: "user", content: fullPrompt }], modelTier)) {
      if (event.type === "text" && event.content) {
        process.stdout.write(event.content)
      }

      if (event.type === "tool_call" && event.toolCall && !quiet) {
        process.stderr.write(`\n[Tool: ${event.toolCall.name}]\n`)
      }

      if (event.type === "tool_result" && event.toolResult && !quiet) {
        if (event.toolResult.error) {
          process.stderr.write(`[Error: ${event.toolResult.error}]\n`)
        }
      }
    }

    // Ensure newline at end
    process.stdout.write("\n")
    process.exit(0)
  } catch (error) {
    console.error("\nError:", error instanceof Error ? error.message : "Unknown error")
    process.exit(1)
  }
}

export interface AppArgs {
  initialModel: ModelTier
  byok: boolean
  resumeSession?: string
  continueSession: boolean
}

/**
 * Launch the OpenTUI-based terminal UI
 */
export function tui(args: AppArgs, onExit?: () => Promise<void>): Promise<void> {
  // Enable bracketed paste mode for better paste handling
  process.stdout.write("\x1b[?2004h")
  process.on("exit", () => {
    process.stdout.write("\x1b[?2004l")
  })

  // Bracketed paste handling - bypass OpenTUI's paste detection which doesn't work
  const PASTE_START = "\x1b[200~"
  const PASTE_END = "\x1b[201~"
  let pasteBuffer = ""
  let inPasteMode = false

  // Global paste handler that will be set by InputArea
  ;(globalThis as any).__10xPasteHandler = null

  const originalStdinOn = process.stdin.on.bind(process.stdin)
  process.stdin.on = function (event: string, listener: (...args: any[]) => void) {
    if (event === "data") {
      return originalStdinOn(event, (data: string | Buffer) => {
        const str = typeof data === "string" ? data : data.toString()

        // Handle bracketed paste directly
        if (str.includes(PASTE_START) || inPasteMode) {
          let remaining = str

          if (!inPasteMode && remaining.includes(PASTE_START)) {
            const startIdx = remaining.indexOf(PASTE_START)
            // Pass through anything before the paste start
            if (startIdx > 0) {
              listener(remaining.substring(0, startIdx))
            }
            remaining = remaining.substring(startIdx + PASTE_START.length)
            inPasteMode = true
            pasteBuffer = ""
          }

          if (inPasteMode) {
            const endIdx = remaining.indexOf(PASTE_END)
            if (endIdx !== -1) {
              // Found end of paste
              pasteBuffer += remaining.substring(0, endIdx)
              inPasteMode = false

              // Call the paste handler
              const handler = (globalThis as any).__10xPasteHandler
              if (handler && pasteBuffer) {
                handler(pasteBuffer)
              }

              // Pass through anything after the paste end
              const afterPaste = remaining.substring(endIdx + PASTE_END.length)
              if (afterPaste) {
                listener(afterPaste)
              }
            } else {
              // Still in paste mode, accumulate
              pasteBuffer += remaining
            }
            return // Don't pass paste data to normal listener
          }
        }

        listener(data)
      })
    }
    return originalStdinOn(event, listener)
  } as typeof process.stdin.on

  return new Promise<void>(async (resolve) => {
    const handleExit = async () => {
      await onExit?.()
      resolve()
    }

    // Re-enable bracketed paste after a short delay (in case setupTerminal resets it)
    setTimeout(() => {
      process.stdout.write("\x1b[?2004h")
    }, 100)

    render(
      () => (
        <ErrorBoundary
          fallback={(error) => (
            <box flexDirection="column" padding={1}>
              <text fg="#EF4444">Fatal error: {String(error?.message || error || "Unknown error")}</text>
              <text fg="#737373">Press Ctrl+C to exit</text>
            </box>
          )}
        >
          <ExitProvider onExit={handleExit}>
            <ThemeProvider mode="dark">
              <KeybindProvider>
                <App
                  initialModel={args.initialModel}
                  byok={args.byok}
                  resumeSession={args.resumeSession}
                  continueSession={args.continueSession}
                />
              </KeybindProvider>
            </ThemeProvider>
          </ExitProvider>
        </ErrorBoundary>
      ),
      {
        targetFps: 60,
        exitOnCtrlC: false,
        useMouse: false,
      }
    )
  })
}

async function main() {
  const modelTier = options.model as ModelTier

  // Validate model tier
  if (!["superfast", "fast", "smart"].includes(modelTier)) {
    console.error(`Invalid model tier: ${modelTier}`)
    console.error("Valid options: superfast, fast, smart")
    process.exit(1)
  }

  // Execute mode: run single prompt and exit
  if (options.execute) {
    await executeMode(options.execute, modelTier, options.quiet ?? false)
    return
  }

  // Interactive mode: render the OpenTUI app
  await tui({
    initialModel: modelTier,
    byok: options.byok ?? false,
    resumeSession: options.resume,
    continueSession: options.continue ?? false,
  })
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
