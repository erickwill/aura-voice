import type { Tool, ToolResult } from '@10x/shared';
import { TODOWRITE_DESCRIPTION } from '../prompts/tools/todowrite.js';

/**
 * Todo item structure
 */
export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

/**
 * In-memory todo state (per session)
 * Exported for UI access
 */
let currentTodos: TodoItem[] = [];

/**
 * Get current todos (for UI display)
 */
export function getTodos(): TodoItem[] {
  return [...currentTodos];
}

/**
 * Clear all todos (for session reset)
 */
export function clearTodos(): void {
  currentTodos = [];
}

/**
 * Format todo list for display
 */
function formatTodoList(todos: TodoItem[]): string {
  if (todos.length === 0) {
    return 'Todo list is empty.';
  }

  const statusIcons: Record<TodoItem['status'], string> = {
    pending: '[ ]',
    in_progress: '[>]',
    completed: '[x]',
  };

  const lines = todos.map((todo, index) => {
    const icon = statusIcons[todo.status];
    const statusLabel = todo.status === 'in_progress' ? ` (${todo.activeForm})` : '';
    return `${index + 1}. ${icon} ${todo.content}${statusLabel}`;
  });

  const completed = todos.filter(t => t.status === 'completed').length;
  const inProgress = todos.filter(t => t.status === 'in_progress').length;
  const pending = todos.filter(t => t.status === 'pending').length;

  lines.push('');
  lines.push(`Progress: ${completed}/${todos.length} completed, ${inProgress} in progress, ${pending} pending`);

  return lines.join('\n');
}

interface TodoWriteParams {
  todos: TodoItem[];
}

export const todoWriteTool: Tool = {
  name: 'todowrite',
  description: TODOWRITE_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        description: 'The updated todo list',
        items: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The task description (imperative form)',
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              description: 'The task status',
            },
            activeForm: {
              type: 'string',
              description: 'Present continuous form shown during execution (e.g., "Running tests")',
            },
          },
          required: ['content', 'status', 'activeForm'],
        },
      },
    },
    required: ['todos'],
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const { todos } = params as unknown as TodoWriteParams;

    try {
      // Validate todos
      if (!Array.isArray(todos)) {
        return {
          success: false,
          error: 'todos must be an array',
        };
      }

      for (const todo of todos) {
        if (!todo.content || typeof todo.content !== 'string') {
          return {
            success: false,
            error: 'Each todo must have a content string',
          };
        }
        if (!['pending', 'in_progress', 'completed'].includes(todo.status)) {
          return {
            success: false,
            error: `Invalid status: ${todo.status}. Must be pending, in_progress, or completed`,
          };
        }
        if (!todo.activeForm || typeof todo.activeForm !== 'string') {
          return {
            success: false,
            error: 'Each todo must have an activeForm string',
          };
        }
      }

      // Update state
      currentTodos = todos.map(t => ({
        content: t.content,
        status: t.status as TodoItem['status'],
        activeForm: t.activeForm,
      }));

      return {
        success: true,
        output: formatTodoList(currentTodos),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update todos: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
