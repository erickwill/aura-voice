export type {
  PermissionAction,
  PermissionRule,
  ToolPermissions,
  PermissionConfig,
  PermissionCheckResult,
  PermissionPromptFn,
} from './types.js';

export {
  DEFAULT_PERMISSIONS,
  loadSettings,
  saveSettings,
  getConfigPath,
} from './config.js';

export {
  PermissionManager,
  getPermissionManager,
  createPermissionManager,
} from './manager.js';
