import { createSignal, createEffect, onMount } from "solid-js"
import { PermissionManager, createPermissionManager } from "@10x/core"
import type { PermissionPromptFn } from "@10x/core"

interface PermissionRequest {
  tool: string
  input: string
  context?: string
  resolve: (allowed: boolean) => void
}

interface UsePermissionsReturn {
  manager: PermissionManager
  pendingRequest: PermissionRequest | null
  respond: (allowed: boolean) => void
}

export function usePermissions(): UsePermissionsReturn {
  let manager: PermissionManager | null = null
  const [pendingRequest, setPendingRequest] = createSignal<PermissionRequest | null>(null)

  const getManager = () => {
    if (!manager) {
      manager = createPermissionManager()
    }
    return manager
  }

  // Set up prompt function on mount
  onMount(() => {
    const mgr = getManager()

    const promptFn: PermissionPromptFn = (tool, input, context) => {
      return new Promise<boolean>((resolve) => {
        setPendingRequest({ tool, input, context, resolve })
      })
    }

    mgr.setPromptFn(promptFn)
  })

  const respond = (allowed: boolean) => {
    const request = pendingRequest()
    if (request) {
      request.resolve(allowed)
      setPendingRequest(null)
    }
  }

  return {
    get manager() {
      return getManager()
    },
    get pendingRequest() {
      return pendingRequest()
    },
    respond,
  }
}
