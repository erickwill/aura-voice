/**
 * Permission action types
 */
export type PermissionAction = 'allow' | 'ask' | 'deny';

/**
 * Permission rule for a specific tool or pattern
 */
export interface PermissionRule {
  /** Pattern to match (glob-style for bash commands, exact for tools) */
  pattern: string;
  /** Action to take when pattern matches */
  action: PermissionAction;
}

/**
 * Tool-specific permission configuration
 */
export interface ToolPermissions {
  /** Default action for this tool */
  default: PermissionAction;
  /** Rules to check (first match wins) */
  rules?: PermissionRule[];
}

/**
 * Full permissions configuration
 */
export interface PermissionConfig {
  /** Read tool permissions */
  read?: ToolPermissions;
  /** Write tool permissions */
  write?: ToolPermissions;
  /** Edit tool permissions */
  edit?: ToolPermissions;
  /** Glob tool permissions */
  glob?: ToolPermissions;
  /** Grep tool permissions */
  grep?: ToolPermissions;
  /** Bash tool permissions */
  bash?: ToolPermissions;
}

/**
 * Result of a permission check
 */
export interface PermissionCheckResult {
  /** Whether permission was granted */
  allowed: boolean;
  /** Action that was determined */
  action: PermissionAction;
  /** Which rule matched (if any) */
  matchedRule?: PermissionRule;
  /** Reason for the decision */
  reason: string;
}

/**
 * Callback for asking user for permission
 */
export type PermissionPromptFn = (
  tool: string,
  input: string,
  context?: string
) => Promise<boolean>;
