// Providers
export { OpenRouterClient, OpenRouterError, getOpenRouterProvider, getLanguageModel, clearProviderCache } from './providers/index.js';
export type { OpenRouterClientConfig, AIProviderConfig } from './providers/index.js';

// Router
export { Router } from './router/index.js';
export type { RouterConfig, StreamEvent, TokenUsage } from './router/index.js';

// Tools
export {
  ToolRegistry,
  createCoreToolRegistry,
  readTool,
  writeTool,
  editTool,
  globTool,
  grepTool,
  bashTool,
  todoWriteTool,
  getTodos,
  clearTodos,
  askUserQuestionTool,
  setAskQuestionPromptFn,
  clearAskQuestionPromptFn,
  enterPlanModeTool,
  exitPlanModeTool,
  setEnterPlanModeCallback,
  clearEnterPlanModeCallback,
  setExitPlanModeCallback,
  clearExitPlanModeCallback,
  getPlanModeState,
  isPlanModeActive,
  resetPlanModeState,
  taskTool,
  setTaskRouterConfig,
  clearTaskRouterConfig,
  setConversationContext,
  clearConversationContext,
  CORE_TOOLS,
} from './tools/index.js';
export type {
  CoreToolName,
  TodoItem,
  Question,
  QuestionOption,
  AskQuestionPromptFn,
  PlanModeState,
  EnterPlanModeCallback,
  ExitPlanModeCallback,
} from './tools/index.js';

// Agents
export {
  executeAgent,
  getAgentConfig,
  listAgentTypes,
  getAgentState,
  clearAgentStates,
} from './agents/index.js';
export type {
  AgentType,
  AgentConfig,
  AgentParams,
  AgentResult,
  AgentState,
} from './agents/index.js';

// Sessions
export { SessionManager } from './sessions/index.js';
export type { Session, SessionSummary, CreateSessionOptions } from './sessions/index.js';

// Permissions
export {
  PermissionManager,
  getPermissionManager,
  createPermissionManager,
  DEFAULT_PERMISSIONS,
  loadSettings,
  saveSettings,
  getConfigPath,
} from './permissions/index.js';
export type {
  PermissionAction,
  PermissionRule,
  ToolPermissions,
  PermissionConfig,
  PermissionCheckResult,
  PermissionPromptFn,
} from './permissions/index.js';

// Guidance
export {
  loadGuidance,
  loadProjectGuidance,
  loadGlobalGuidance,
  getGlobalGuidancePath,
  getProjectGuidancePath,
  buildSystemPromptWithGuidance,
  buildFullSystemPrompt,
} from './guidance/index.js';
export type { GuidanceResult } from './guidance/index.js';

// Skills
export {
  loadSkills,
  getSkill,
  listSkillNames,
  getGlobalSkillsPath,
  getProjectSkillsPath,
  formatSkillsForPrompt,
  buildSkillsPromptSection,
} from './skills/index.js';
export type {
  Skill,
  SkillFrontmatter,
  SkillsResult,
  SkillLoadError,
} from './skills/index.js';

// Multimodal
export {
  isImageFile,
  imageToDataUrl,
  createImagePart,
  createTextPart,
  parseMessageWithImages,
  getImageModel,
  supportsVision,
} from './multimodal/index.js';

// Superpowers
export {
  loadSuperpowers,
  getSuperpower,
  listSuperpowerNames,
  listSuperpowerTriggers,
  formatSuperpowersForPrompt,
  getGlobalSuperpowersPath,
  getProjectSuperpowersPath,
  clearSuperpowersCache,
  SuperpowerExecutor,
  createSuperpowerExecutor,
} from './superpowers/index.js';
export type {
  Superpower,
  SuperpowerStep,
  SuperpowerFrontmatter,
  SuperpowersResult,
  SuperpowerLoadError,
  SuperpowerContext,
  StepResult,
  SuperpowerResult,
  SuperpowerEvent,
} from './superpowers/index.js';

// Prompts - System
export {
  SYSTEM_PROMPT,
  SECURITY_PROMPT,
} from './prompts/index.js';

// Prompts - Tools
export {
  BASH_DESCRIPTION,
  READ_DESCRIPTION,
  EDIT_DESCRIPTION,
  WRITE_DESCRIPTION,
  GLOB_DESCRIPTION,
  GREP_DESCRIPTION,
  TASK_DESCRIPTION,
  TODOWRITE_DESCRIPTION,
  ASKUSERQUESTION_DESCRIPTION,
  WEBFETCH_DESCRIPTION,
  WEBSEARCH_DESCRIPTION,
  LSP_DESCRIPTION,
  ENTERPLANMODE_DESCRIPTION,
  EXITPLANMODE_DESCRIPTION,
} from './prompts/index.js';

// Prompts - Agents
export {
  EXPLORE_AGENT_PROMPT,
  SUMMARIZATION_AGENT_PROMPT,
  REVIEW_PR_AGENT_PROMPT,
  TITLE_GEN_AGENT_PROMPT,
} from './prompts/index.js';

// Re-export shared types for convenience
export * from '@10x/shared';
