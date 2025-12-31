import { createSignal, createEffect, onMount } from "solid-js"
import { SessionManager } from "@10x/core"
import type { Session, SessionSummary } from "@10x/core"
import type { ModelTier, Message } from "@10x/shared"

interface UseSessionOptions {
  autoResume?: boolean
  defaultModel?: ModelTier
}

interface UseSessionReturn {
  session: Session | null
  sessions: SessionSummary[]
  create: (name?: string) => Session
  resume: (nameOrId: string) => Session | null
  resumeLast: () => Session | null
  rename: (name: string) => boolean
  clear: () => void
  fork: (name?: string) => Session | null
  list: () => SessionSummary[]
  addMessage: (message: Message) => void
  needsCompaction: () => boolean
  tokenCount: number
  contextWindow: number
}

export function useSession({
  autoResume = false,
  defaultModel = "smart",
}: UseSessionOptions = {}): UseSessionReturn {
  let manager: SessionManager | null = null
  const [session, setSession] = createSignal<Session | null>(null)
  const [sessions, setSessions] = createSignal<SessionSummary[]>([])

  const getManager = () => {
    if (!manager) {
      manager = new SessionManager()
    }
    return manager
  }

  // Load sessions list on mount
  onMount(() => {
    const mgr = getManager()
    setSessions(mgr.list())

    if (autoResume) {
      const last = mgr.resumeLast()
      if (last) {
        setSession(last)
      }
    }
  })

  const create = (name?: string) => {
    const mgr = getManager()
    const newSession = mgr.create({ name, model: defaultModel })
    setSession(newSession)
    setSessions(mgr.list())
    return newSession
  }

  const resume = (nameOrId: string) => {
    const mgr = getManager()

    let found = mgr.loadByName(nameOrId)
    if (!found) {
      found = mgr.load(nameOrId)
    }

    if (found) {
      setSession(found)
    }
    return found
  }

  const resumeLast = () => {
    const mgr = getManager()
    const last = mgr.resumeLast()
    if (last) {
      setSession(last)
    }
    return last
  }

  const rename = (name: string) => {
    const mgr = getManager()
    const success = mgr.rename(name)
    if (success) {
      setSession(mgr.getCurrent())
      setSessions(mgr.list())
    }
    return success
  }

  const clear = () => {
    const mgr = getManager()
    mgr.clear()
    setSession(mgr.getCurrent())
  }

  const fork = (name?: string) => {
    const mgr = getManager()
    const forked = mgr.fork(name)
    if (forked) {
      setSession(forked)
      setSessions(mgr.list())
    }
    return forked
  }

  const list = () => {
    const mgr = getManager()
    const sessionList = mgr.list()
    setSessions(sessionList)
    return sessionList
  }

  const addMessage = (message: Message) => {
    const mgr = getManager()

    if (!mgr.getCurrent()) {
      mgr.create({ model: defaultModel })
    }

    mgr.addMessage(message)
    setSession({ ...mgr.getCurrent()! })
  }

  const needsCompaction = () => {
    const mgr = getManager()
    return mgr.needsCompaction()
  }

  const tokenCount = () => {
    const s = session()
    return s ? s.tokenUsage.input + s.tokenUsage.output : 0
  }

  const contextWindow = () => getManager().getContextWindow()

  return {
    get session() {
      return session()
    },
    get sessions() {
      return sessions()
    },
    create,
    resume,
    resumeLast,
    rename,
    clear,
    fork,
    list,
    addMessage,
    needsCompaction,
    get tokenCount() {
      return tokenCount()
    },
    get contextWindow() {
      return contextWindow()
    },
  }
}
