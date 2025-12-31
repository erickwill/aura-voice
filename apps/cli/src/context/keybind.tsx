import { createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { useKeyboard, useRenderer } from "@opentui/solid"
import type { ParsedKey, Renderable } from "@opentui/core"
import { createSimpleContext } from "./helper"

export type KeybindConfig = {
  leader: string[]
  submit: string[]
  cancel: string[]
  quit: string[]
  historyUp: string[]
  historyDown: string[]
  killLine: string[]
  killToEnd: string[]
  yank: string[]
  wordBackward: string[]
  lineStart: string[]
  lineEnd: string[]
}

const DEFAULT_KEYBINDS: KeybindConfig = {
  leader: ["ctrl+a"],
  submit: ["enter"],
  cancel: ["escape"],
  quit: ["ctrl+c"],
  historyUp: ["up"],
  historyDown: ["down"],
  killLine: ["ctrl+u"],
  killToEnd: ["ctrl+k"],
  yank: ["ctrl+y"],
  wordBackward: ["ctrl+w"],
  lineStart: ["ctrl+a"],
  lineEnd: ["ctrl+e"],
}

export type KeybindInfo = {
  key: string
  ctrl: boolean
  meta: boolean
  shift: boolean
  leader: boolean
}

function parseKeybind(keybind: string): KeybindInfo {
  const parts = keybind.toLowerCase().split("+")
  const key = parts[parts.length - 1] || ""
  return {
    key,
    ctrl: parts.includes("ctrl"),
    meta: parts.includes("meta") || parts.includes("alt"),
    shift: parts.includes("shift"),
    leader: parts.includes("leader"),
  }
}

function matchKeybind(parsed: KeybindInfo, evt: ParsedKey, leaderActive: boolean): boolean {
  if (parsed.leader && !leaderActive) return false
  if (parsed.ctrl !== (evt.ctrl ?? false)) return false
  if (parsed.meta !== (evt.meta ?? false)) return false
  if (parsed.shift !== (evt.shift ?? false)) return false
  return parsed.key === evt.name?.toLowerCase()
}

export const { use: useKeybind, provider: KeybindProvider } = createSimpleContext({
  name: "Keybind",
  init: () => {
    const keybinds = createMemo(() => DEFAULT_KEYBINDS)
    const [store, setStore] = createStore({
      leader: false,
    })
    const renderer = useRenderer()

    let focus: Renderable | null = null
    let timeout: NodeJS.Timeout

    function leader(active: boolean) {
      if (active) {
        setStore("leader", true)
        focus = renderer.currentFocusedRenderable
        focus?.blur()
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          if (!store.leader) return
          leader(false)
          if (focus) {
            focus.focus()
          }
        }, 2000)
        return
      }

      if (!active) {
        if (focus && !renderer.currentFocusedRenderable) {
          focus.focus()
        }
        setStore("leader", false)
      }
    }

    useKeyboard(async (evt) => {
      if (!store.leader && result.match("leader", evt)) {
        leader(true)
        return
      }

      if (store.leader && evt.name) {
        setImmediate(() => {
          if (focus && renderer.currentFocusedRenderable === focus) {
            focus.focus()
          }
          leader(false)
        })
      }
    })

    const result = {
      get all() {
        return keybinds()
      },
      get leader() {
        return store.leader
      },
      parse(evt: ParsedKey): KeybindInfo {
        return {
          key: evt.name?.toLowerCase() || "",
          ctrl: evt.ctrl ?? false,
          meta: evt.meta ?? false,
          shift: evt.shift ?? false,
          leader: store.leader,
        }
      },
      match(key: keyof KeybindConfig, evt: ParsedKey): boolean {
        const bindings = keybinds()[key]
        if (!bindings) return false
        const parsed = result.parse(evt)
        for (const binding of bindings) {
          const keybind = parseKeybind(binding)
          if (matchKeybind(keybind, evt, store.leader)) {
            return true
          }
        }
        return false
      },
      print(key: keyof KeybindConfig): string {
        const first = keybinds()[key]?.[0]
        if (!first) return ""
        return first.replace("ctrl+", "^").replace("meta+", "M-").replace("shift+", "S-")
      },
    }
    return result
  },
})
