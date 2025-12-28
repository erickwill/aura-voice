import { useState, useCallback, useRef, useEffect } from 'react';
import { PermissionManager, createPermissionManager } from '@10x/core';
import type { PermissionPromptFn } from '@10x/core';

interface PermissionRequest {
  tool: string;
  input: string;
  context?: string;
  resolve: (allowed: boolean) => void;
}

interface UsePermissionsReturn {
  manager: PermissionManager;
  pendingRequest: PermissionRequest | null;
  respond: (allowed: boolean) => void;
}

export function usePermissions(): UsePermissionsReturn {
  const managerRef = useRef<PermissionManager | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PermissionRequest | null>(null);

  // Initialize manager
  const getManager = useCallback(() => {
    if (!managerRef.current) {
      managerRef.current = createPermissionManager();
    }
    return managerRef.current;
  }, []);

  // Set up prompt function
  useEffect(() => {
    const manager = getManager();

    const promptFn: PermissionPromptFn = (tool, input, context) => {
      return new Promise<boolean>((resolve) => {
        setPendingRequest({ tool, input, context, resolve });
      });
    };

    manager.setPromptFn(promptFn);
  }, [getManager]);

  // Handle user response
  const respond = useCallback((allowed: boolean) => {
    if (pendingRequest) {
      pendingRequest.resolve(allowed);
      setPendingRequest(null);
    }
  }, [pendingRequest]);

  return {
    manager: getManager(),
    pendingRequest,
    respond,
  };
}
