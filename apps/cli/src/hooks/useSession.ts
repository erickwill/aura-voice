import { useState, useCallback, useRef, useEffect } from 'react';
import { SessionManager } from '@10x/core';
import type { Session, SessionSummary } from '@10x/core';
import type { ModelTier, Message } from '@10x/shared';

interface UseSessionOptions {
  autoResume?: boolean;
  defaultModel?: ModelTier;
}

interface UseSessionReturn {
  session: Session | null;
  sessions: SessionSummary[];
  create: (name?: string) => Session;
  resume: (nameOrId: string) => Session | null;
  resumeLast: () => Session | null;
  rename: (name: string) => boolean;
  clear: () => void;
  fork: (name?: string) => Session | null;
  list: () => SessionSummary[];
  addMessage: (message: Message) => void;
  needsCompaction: () => boolean;
  tokenCount: number;
  contextWindow: number;
}

export function useSession({
  autoResume = false,
  defaultModel = 'smart',
}: UseSessionOptions = {}): UseSessionReturn {
  const managerRef = useRef<SessionManager | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  // Initialize manager
  const getManager = useCallback(() => {
    if (!managerRef.current) {
      managerRef.current = new SessionManager();
    }
    return managerRef.current;
  }, []);

  // Load sessions list on mount
  useEffect(() => {
    const manager = getManager();
    setSessions(manager.list());

    if (autoResume) {
      const last = manager.resumeLast();
      if (last) {
        setSession(last);
      }
    }
  }, [autoResume, getManager]);

  const create = useCallback(
    (name?: string) => {
      const manager = getManager();
      const newSession = manager.create({ name, model: defaultModel });
      setSession(newSession);
      setSessions(manager.list());
      return newSession;
    },
    [getManager, defaultModel]
  );

  const resume = useCallback(
    (nameOrId: string) => {
      const manager = getManager();

      // Try by name first
      let found = manager.loadByName(nameOrId);
      if (!found) {
        // Try by ID
        found = manager.load(nameOrId);
      }

      if (found) {
        setSession(found);
      }
      return found;
    },
    [getManager]
  );

  const resumeLast = useCallback(() => {
    const manager = getManager();
    const last = manager.resumeLast();
    if (last) {
      setSession(last);
    }
    return last;
  }, [getManager]);

  const rename = useCallback(
    (name: string) => {
      const manager = getManager();
      const success = manager.rename(name);
      if (success) {
        setSession(manager.getCurrent());
        setSessions(manager.list());
      }
      return success;
    },
    [getManager]
  );

  const clear = useCallback(() => {
    const manager = getManager();
    manager.clear();
    setSession(manager.getCurrent());
  }, [getManager]);

  const fork = useCallback(
    (name?: string) => {
      const manager = getManager();
      const forked = manager.fork(name);
      if (forked) {
        setSession(forked);
        setSessions(manager.list());
      }
      return forked;
    },
    [getManager]
  );

  const list = useCallback(() => {
    const manager = getManager();
    const sessionList = manager.list();
    setSessions(sessionList);
    return sessionList;
  }, [getManager]);

  const addMessage = useCallback(
    (message: Message) => {
      const manager = getManager();

      // Create session if needed
      if (!manager.getCurrent()) {
        manager.create({ model: defaultModel });
      }

      manager.addMessage(message);
      setSession({ ...manager.getCurrent()! });
    },
    [getManager, defaultModel]
  );

  const needsCompaction = useCallback(() => {
    const manager = getManager();
    return manager.needsCompaction();
  }, [getManager]);

  const tokenCount = session
    ? session.tokenUsage.input + session.tokenUsage.output
    : 0;

  const contextWindow = getManager().getContextWindow();

  return {
    session,
    sessions,
    create,
    resume,
    resumeLast,
    rename,
    clear,
    fork,
    list,
    addMessage,
    needsCompaction,
    tokenCount,
    contextWindow,
  };
}
