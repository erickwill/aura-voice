import type { Tool, ToolResult } from '@10x/shared';
import { ASKUSERQUESTION_DESCRIPTION } from '../prompts/tools/askuserquestion.js';

/**
 * Question option structure
 */
export interface QuestionOption {
  label: string;
  description?: string;
}

/**
 * Question structure
 */
export interface Question {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

/**
 * Type for the prompt function that UI provides
 */
export type AskQuestionPromptFn = (
  questions: Question[]
) => Promise<Record<string, string>>;

/**
 * Module-level prompt function (set by CLI)
 */
let promptFn: AskQuestionPromptFn | null = null;

/**
 * Set the prompt function (called by CLI hook)
 */
export function setAskQuestionPromptFn(fn: AskQuestionPromptFn): void {
  promptFn = fn;
}

/**
 * Clear the prompt function
 */
export function clearAskQuestionPromptFn(): void {
  promptFn = null;
}

interface AskUserQuestionParams {
  questions: Question[];
}

export const askUserQuestionTool: Tool = {
  name: 'askuserquestion',
  description: ASKUSERQUESTION_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        description: 'Questions to ask the user (1-4 questions)',
        items: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'The complete question to ask the user',
            },
            header: {
              type: 'string',
              description: 'Very short label (max 12 chars). Examples: "Auth method", "Library"',
            },
            options: {
              type: 'array',
              description: 'The available choices (2-4 options)',
              items: {
                type: 'object',
                properties: {
                  label: {
                    type: 'string',
                    description: 'The display text for this option',
                  },
                  description: {
                    type: 'string',
                    description: 'Explanation of what this option means',
                  },
                },
                required: ['label', 'description'],
              },
            },
            multiSelect: {
              type: 'boolean',
              description: 'Set to true to allow multiple selections',
            },
          },
          required: ['question', 'header', 'options', 'multiSelect'],
        },
      },
    },
    required: ['questions'],
  },

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const { questions } = params as unknown as AskUserQuestionParams;

    try {
      // Validate questions
      if (!Array.isArray(questions) || questions.length === 0) {
        return {
          success: false,
          error: 'questions must be a non-empty array',
        };
      }

      if (questions.length > 4) {
        return {
          success: false,
          error: 'Maximum 4 questions allowed',
        };
      }

      for (const q of questions) {
        if (!q.question || typeof q.question !== 'string') {
          return { success: false, error: 'Each question must have a question string' };
        }
        if (!q.header || typeof q.header !== 'string') {
          return { success: false, error: 'Each question must have a header string' };
        }
        if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) {
          return { success: false, error: 'Each question must have 2-4 options' };
        }
      }

      // Check if prompt function is available
      if (!promptFn) {
        // Fallback: return a message asking user to respond
        const fallbackOutput = questions.map(q => {
          const optionsList = q.options.map((o, i) => `  ${i + 1}. ${o.label}: ${o.description || ''}`).join('\n');
          return `${q.header}: ${q.question}\nOptions:\n${optionsList}`;
        }).join('\n\n');

        return {
          success: true,
          output: `Please answer the following questions:\n\n${fallbackOutput}\n\n(Note: Interactive question UI not available, please respond in chat)`,
        };
      }

      // Call the prompt function and wait for user response
      const answers = await promptFn(questions);

      // Format the answers for output
      const answerLines = Object.entries(answers).map(
        ([question, answer]) => `"${question}"="${answer}"`
      );

      return {
        success: true,
        output: `User has answered your questions: ${answerLines.join(', ')}. You can now continue with the user's answers in mind.`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to ask question: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
