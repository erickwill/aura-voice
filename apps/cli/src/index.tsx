#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { App } from './components/App.js';
import { getApiKey } from './config.js';
import {
  OpenRouterClient,
  Router,
  createCoreToolRegistry,
  buildFullSystemPrompt,
  buildSkillsPromptSection,
} from '@10x/core';
import type { ModelTier } from '@10x/shared';

const program = new Command();

program
  .name('10x')
  .description('AI coding assistant — code at 10x speed')
  .version('0.1.0')
  .option('--byok', 'Use your own OpenRouter API key')
  .option('-m, --model <tier>', 'Model tier: superfast, fast, or smart', 'smart')
  .option('-r, --resume <name>', 'Resume a named session')
  .option('-c, --continue', 'Continue the last session')
  .option('-x, --execute <prompt>', 'Execute a single prompt and exit')
  .option('-q, --quiet', 'Suppress status output in execute mode')
  .parse();

const options = program.opts();

/**
 * Execute a single prompt and exit (non-interactive mode)
 */
async function executeMode(prompt: string, modelTier: ModelTier, quiet: boolean): Promise<void> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.error('Error: No API key configured.');
    console.error('Run 10x interactively first to set up your API key, or set OPENROUTER_API_KEY environment variable.');
    process.exit(1);
  }

  // Check for piped input
  let fullPrompt = prompt;
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const stdinContent = Buffer.concat(chunks).toString('utf-8').trim();
    if (stdinContent) {
      fullPrompt = `${prompt}\n\n<stdin>\n${stdinContent}\n</stdin>`;
    }
  }

  // Build system prompt
  const basePrompt = `You are 10x, a fast and helpful AI coding assistant. Be concise and direct. You have access to tools for reading, writing, and editing files, searching with glob and grep, and running bash commands.`;
  const skillsSection = buildSkillsPromptSection();
  const systemPrompt = buildFullSystemPrompt(basePrompt, skillsSection);

  // Create router with tools
  const client = new OpenRouterClient({ apiKey });
  const tools = createCoreToolRegistry();
  const router = new Router({
    client,
    tools,
    defaultTier: modelTier,
    systemPrompt,
  });

  if (!quiet) {
    process.stderr.write(`[10x] Model: ${modelTier}\n`);
  }

  try {
    // Stream the response
    for await (const event of router.stream([{ role: 'user', content: fullPrompt }], modelTier)) {
      if (event.type === 'text' && event.content) {
        process.stdout.write(event.content);
      }

      if (event.type === 'tool_call' && event.toolCall && !quiet) {
        process.stderr.write(`\n[Tool: ${event.toolCall.name}]\n`);
      }

      if (event.type === 'tool_result' && event.toolResult && !quiet) {
        if (event.toolResult.error) {
          process.stderr.write(`[Error: ${event.toolResult.error}]\n`);
        }
      }
    }

    // Ensure newline at end
    process.stdout.write('\n');
    process.exit(0);
  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

async function main() {
  const modelTier = options.model as ModelTier;

  // Validate model tier
  if (!['superfast', 'fast', 'smart'].includes(modelTier)) {
    console.error(`Invalid model tier: ${modelTier}`);
    console.error('Valid options: superfast, fast, smart');
    process.exit(1);
  }

  // Execute mode: run single prompt and exit
  if (options.execute) {
    await executeMode(options.execute, modelTier, options.quiet ?? false);
    return;
  }

  // Interactive mode: render the Ink app
  const { waitUntilExit } = render(
    <App
      initialModel={modelTier}
      byok={options.byok}
      resumeSession={options.resume}
      continueSession={options.continue}
    />
  );

  await waitUntilExit();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
