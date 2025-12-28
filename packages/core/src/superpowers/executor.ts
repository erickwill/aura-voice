import type { ModelTier, ChatMessage } from '@10x/shared';
import type { Router } from '../router/router.js';
import type {
  Superpower,
  SuperpowerStep,
  SuperpowerContext,
  StepResult,
  SuperpowerResult,
  SuperpowerEvent,
} from './types.js';

/**
 * Execute a superpower workflow
 */
export class SuperpowerExecutor {
  private router: Router;

  constructor(router: Router) {
    this.router = router;
  }

  /**
   * Execute a superpower and yield events
   */
  async *execute(
    superpower: Superpower,
    userInput: string,
    options: {
      cwd?: string;
      images?: string[];
    } = {}
  ): AsyncGenerator<SuperpowerEvent, SuperpowerResult, unknown> {
    const context: SuperpowerContext = {
      userInput,
      cwd: options.cwd || process.cwd(),
      images: options.images,
      stepOutputs: new Map(),
    };

    const stepResults: StepResult[] = [];
    let lastOutput = '';

    for (const step of superpower.steps) {
      // Emit step start
      yield {
        type: 'step_start',
        step: step.number,
        name: step.name,
        model: step.model,
      };

      try {
        // Build the prompt with variable substitution
        const prompt = this.buildPrompt(step, context);

        // Execute the step
        let stepOutput = '';

        for await (const event of this.router.stream(
          [{ role: 'user', content: prompt }],
          step.model
        )) {
          if (event.type === 'text' && event.content) {
            stepOutput += event.content;
            yield {
              type: 'step_text',
              step: step.number,
              content: event.content,
            };
          }
        }

        // Store the output
        context.stepOutputs.set(step.number, stepOutput);
        lastOutput = stepOutput;

        const result: StepResult = {
          step: step.number,
          name: step.name,
          output: stepOutput,
          model: step.model,
          success: true,
        };

        stepResults.push(result);

        yield {
          type: 'step_complete',
          step: step.number,
          output: stepOutput,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        const result: StepResult = {
          step: step.number,
          name: step.name,
          output: '',
          model: step.model,
          success: false,
          error: errorMsg,
        };

        stepResults.push(result);

        yield {
          type: 'step_error',
          step: step.number,
          error: errorMsg,
        };

        // Return early on error
        const finalResult: SuperpowerResult = {
          superpower: superpower.name,
          success: false,
          steps: stepResults,
          finalOutput: lastOutput,
          error: `Step ${step.number} failed: ${errorMsg}`,
        };

        yield { type: 'complete', result: finalResult };
        return finalResult;
      }
    }

    // All steps completed successfully
    const finalResult: SuperpowerResult = {
      superpower: superpower.name,
      success: true,
      steps: stepResults,
      finalOutput: lastOutput,
    };

    yield { type: 'complete', result: finalResult };
    return finalResult;
  }

  /**
   * Build the prompt for a step with variable substitution
   */
  private buildPrompt(step: SuperpowerStep, context: SuperpowerContext): string {
    let prompt = step.prompt;

    // Replace user input
    prompt = prompt.replace(/\{\{input\}\}/g, context.userInput);
    prompt = prompt.replace(/\{\{user_input\}\}/g, context.userInput);

    // Replace working directory
    prompt = prompt.replace(/\{\{cwd\}\}/g, context.cwd);

    // Replace previous step output
    if (step.usesPreviousOutput && step.number > 1) {
      const previousOutput = context.stepOutputs.get(step.number - 1) || '';
      prompt = prompt.replace(/\{\{previous\}\}/g, previousOutput);
      prompt = prompt.replace(/\{\{output\}\}/g, previousOutput);
    }

    // Replace specific step outputs: {{step1}}, {{step2}}, etc.
    for (const [stepNum, output] of context.stepOutputs) {
      prompt = prompt.replace(new RegExp(`\\{\\{step${stepNum}\\}\\}`, 'g'), output);
    }

    // Replace image references
    if (context.images && context.images.length > 0) {
      prompt = prompt.replace(/\{\{image\}\}/g, context.images[0]);
      prompt = prompt.replace(/\{\{images\}\}/g, context.images.join(', '));
    }

    return prompt;
  }

  /**
   * Execute a superpower and return the final result (non-streaming)
   */
  async run(
    superpower: Superpower,
    userInput: string,
    options: {
      cwd?: string;
      images?: string[];
      onStep?: (event: SuperpowerEvent) => void;
    } = {}
  ): Promise<SuperpowerResult> {
    let result: SuperpowerResult | undefined;

    for await (const event of this.execute(superpower, userInput, options)) {
      if (options.onStep) {
        options.onStep(event);
      }

      if (event.type === 'complete') {
        result = event.result;
      }
    }

    return result!;
  }
}

/**
 * Create a superpower executor with the given router
 */
export function createSuperpowerExecutor(router: Router): SuperpowerExecutor {
  return new SuperpowerExecutor(router);
}
