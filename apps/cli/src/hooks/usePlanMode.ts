import { createSignal, onMount, onCleanup } from "solid-js"
import { join } from "path"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { homedir } from "os"
import {
  setEnterPlanModeCallback,
  clearEnterPlanModeCallback,
  setExitPlanModeCallback,
  clearExitPlanModeCallback,
} from "@10x/core"
import type { EnterPlanModeCallback, ExitPlanModeCallback } from "@10x/core"

export interface PlanModeState {
  active: boolean
  planFilePath: string | null
  awaitingApproval: boolean
  planContent: string | null
}

export interface PlanApprovalRequest {
  planFilePath: string
  planContent: string
  resolve: (approved: boolean) => void
}

export interface UsePlanModeReturn {
  planMode: PlanModeState
  pendingApproval: PlanApprovalRequest | null
  approve: () => void
  reject: () => void
}

/**
 * Generate a unique plan file name using adjective-adjective-noun pattern
 */
function generatePlanFileName(): string {
  const adjectives = [
    "quick", "bright", "calm", "bold", "swift",
    "keen", "warm", "cool", "fair", "kind",
    "wise", "pure", "neat", "firm", "soft",
    "wild", "free", "vast", "deep", "high",
  ]
  const nouns = [
    "falcon", "river", "mountain", "forest", "ocean",
    "thunder", "crystal", "phoenix", "summit", "horizon",
    "meadow", "canyon", "glacier", "prairie", "harbor",
    "cascade", "zenith", "aurora", "cosmos", "nebula",
  ]
  const verbs = [
    "running", "flowing", "soaring", "blazing", "shining",
    "dancing", "drifting", "gliding", "leaping", "racing",
    "percolating", "cascading", "ascending", "emerging", "evolving",
  ]

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const verb = verbs[Math.floor(Math.random() * verbs.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]

  return `${adj}-${verb}-${noun}`
}

/**
 * Get the plans directory path
 */
function getPlansDir(): string {
  const configDir = join(homedir(), ".claude-personal")
  const plansDir = join(configDir, "plans")
  return plansDir
}

/**
 * Ensure plans directory exists
 */
function ensurePlansDir(): string {
  const plansDir = getPlansDir()
  if (!existsSync(plansDir)) {
    mkdirSync(plansDir, { recursive: true })
  }
  return plansDir
}

export function usePlanMode(): UsePlanModeReturn {
  const [planMode, setPlanMode] = createSignal<PlanModeState>({
    active: false,
    planFilePath: null,
    awaitingApproval: false,
    planContent: null,
  })
  const [pendingApproval, setPendingApproval] = createSignal<PlanApprovalRequest | null>(null)

  onMount(() => {
    // Set up enter plan mode callback
    const enterCallback: EnterPlanModeCallback = async (_task: string) => {
      return new Promise<{ approved: boolean; planFilePath: string }>((resolve) => {
        const plansDir = ensurePlansDir()
        const planFileName = generatePlanFileName()
        const planFilePath = join(plansDir, `${planFileName}.md`)

        // Create empty plan file with header
        const initialContent = `# Implementation Plan\n\n<!-- Write your implementation plan here -->\n\n`
        writeFileSync(planFilePath, initialContent)

        // Update state
        setPlanMode({
          active: true,
          planFilePath,
          awaitingApproval: false,
          planContent: null,
        })

        // Auto-approve entering plan mode (user sees tool result)
        resolve({ approved: true, planFilePath })
      })
    }

    // Set up exit plan mode callback
    const exitCallback: ExitPlanModeCallback = async (planFilePath: string) => {
      return new Promise<{ approved: boolean; planContent: string }>((resolve) => {
        // Read the plan file
        let planContent = ""
        try {
          planContent = readFileSync(planFilePath, "utf-8")
        } catch (error) {
          planContent = `Error reading plan file: ${error instanceof Error ? error.message : String(error)}`
        }

        // Update state to awaiting approval
        setPlanMode(prev => ({
          ...prev,
          awaitingApproval: true,
          planContent,
        }))

        // Set pending approval request
        setPendingApproval({
          planFilePath,
          planContent,
          resolve: (approved: boolean) => {
            // Reset state
            setPlanMode({
              active: false,
              planFilePath: null,
              awaitingApproval: false,
              planContent: null,
            })
            setPendingApproval(null)

            resolve({ approved, planContent })
          },
        })
      })
    }

    setEnterPlanModeCallback(enterCallback)
    setExitPlanModeCallback(exitCallback)
  })

  onCleanup(() => {
    clearEnterPlanModeCallback()
    clearExitPlanModeCallback()
  })

  const approve = () => {
    const request = pendingApproval()
    if (request) {
      request.resolve(true)
    }
  }

  const reject = () => {
    const request = pendingApproval()
    if (request) {
      request.resolve(false)
    }
  }

  return {
    get planMode() {
      return planMode()
    },
    get pendingApproval() {
      return pendingApproval()
    },
    approve,
    reject,
  }
}
