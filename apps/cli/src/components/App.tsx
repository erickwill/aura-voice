import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { colors } from '../styles/colors.js';
import { banner, welcomeMessage } from '../styles/banner.js';
import { StatusBar } from './StatusBar.js';
import { InputArea } from './InputArea.js';
import { MessageList } from './MessageList.js';
import { ApiKeyPrompt } from './ApiKeyPrompt.js';
import { PermissionPrompt } from './PermissionPrompt.js';
import { useChat } from '../hooks/useChat.js';
import { useSession } from '../hooks/useSession.js';
import { usePermissions } from '../hooks/usePermissions.js';
import { loadConfig, saveApiKey, getApiKey } from '../config.js';
import { buildFullSystemPrompt, buildSkillsPromptSection, getSkill, listSkillNames, isImageFile, createImagePart, createTextPart, parseMessageWithImages, getSuperpower, listSuperpowerTriggers, formatSuperpowersForPrompt } from '@10x/core';
import type { ModelTier } from '@10x/shared';
import { existsSync } from 'fs';
import { resolve } from 'path';

interface AppProps {
  initialModel?: ModelTier;
  byok?: boolean;
  resumeSession?: string;
  continueSession?: boolean;
}

type AppState = 'loading' | 'need_api_key' | 'ready';

export function App({
  initialModel = 'smart',
  byok = false,
  resumeSession,
  continueSession = false,
}: AppProps) {
  const { exit } = useApp();
  const [appState, setAppState] = useState<AppState>('loading');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [systemMessage, setSystemMessage] = useState<string | null>(null);

  // Session management
  const session = useSession({ defaultModel: initialModel });

  // Permissions management
  const permissions = usePermissions();

  // Initialize on mount
  useEffect(() => {
    const existingKey = getApiKey();
    if (existingKey) {
      setApiKey(existingKey);
      setAppState('ready');

      // Handle session resume
      if (resumeSession) {
        const resumed = session.resume(resumeSession);
        if (resumed) {
          setShowWelcome(false);
          setSystemMessage(`Resumed session: ${resumed.name ?? resumed.id}`);
        } else {
          setSystemMessage(`Session not found: ${resumeSession}`);
        }
      } else if (continueSession) {
        const last = session.resumeLast();
        if (last) {
          setShowWelcome(false);
          setSystemMessage(`Continued session: ${last.name ?? last.id}`);
        }
      }
    } else if (byok) {
      setAppState('need_api_key');
    } else {
      setAppState('need_api_key');
    }
  }, [byok, resumeSession, continueSession]);

  // Build system prompt with guidance from 10X.md files, skills, and superpowers
  const systemPrompt = useMemo(() => {
    const basePrompt = `You are 10x, a fast and helpful AI coding assistant. Be concise and direct. You have access to tools for reading, writing, and editing files, searching with glob and grep, and running bash commands.`;
    const skillsSection = buildSkillsPromptSection();
    const superpowersSection = formatSuperpowersForPrompt();
    const combinedExtras = [skillsSection, superpowersSection].filter(Boolean).join('\n\n');
    return buildFullSystemPrompt(basePrompt, combinedExtras);
  }, []);

  // Chat hook
  const chat = useChat({
    apiKey: apiKey ?? '',
    defaultTier: initialModel,
    systemPrompt,
    permissionManager: permissions.manager,
  });

  useInput((input, key) => {
    if (appState !== 'ready') return;

    if (key.ctrl && input === 'c') {
      if (inputValue) {
        setInputValue('');
      } else {
        exit();
      }
    }
    if (key.ctrl && input === 'd') {
      exit();
    }
  });

  const handleApiKeySubmit = (key: string) => {
    saveApiKey(key);
    setApiKey(key);
    setAppState('ready');
  };

  const handleApiKeyCancel = () => {
    exit();
  };

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;
    setSystemMessage(null);

    // Hide welcome on first message
    if (showWelcome) {
      setShowWelcome(false);
    }

    // Handle slash commands
    if (value.startsWith('/')) {
      const parts = value.slice(1).trim().split(/\s+/);
      const command = parts[0]?.toLowerCase();
      const args = parts.slice(1).join(' ');

      switch (command) {
        case 'help':
          setSystemMessage(`Commands:
  /help              Show this help
  /clear             Clear conversation
  /sessions          List recent sessions
  /resume <name>     Resume a session
  /rename <name>     Rename current session
  /fork [name]       Fork current session
  /model             Show current model
  /skills            List available skills
  /superpowers       List multi-step workflows
  /image <file>      Analyze an image
  /quit              Exit 10x

Image references: Use @path/to/image.png in messages
Skills: /<skill-name> [args]
Superpowers: /review, /pr, /refactor [args]`);
          setInputValue('');
          return;

        case 'clear':
          chat.clearMessages();
          session.clear();
          setShowWelcome(true);
          setInputValue('');
          return;

        case 'sessions':
          const list = session.list();
          if (list.length === 0) {
            setSystemMessage('No sessions found.');
          } else {
            const formatted = list
              .slice(0, 10)
              .map((s, i) => {
                const name = s.name ?? s.id.slice(0, 8);
                const date = s.updatedAt.toLocaleDateString();
                const msgs = s.messageCount;
                return `  ${i + 1}. ${name} (${msgs} msgs, ${date})`;
              })
              .join('\n');
            setSystemMessage(`Recent sessions:\n${formatted}`);
          }
          setInputValue('');
          return;

        case 'resume':
          if (!args) {
            setSystemMessage('Usage: /resume <name or id>');
          } else {
            const resumed = session.resume(args);
            if (resumed) {
              // Sync messages to chat
              chat.clearMessages();
              setShowWelcome(false);
              setSystemMessage(`Resumed: ${resumed.name ?? resumed.id}`);
            } else {
              setSystemMessage(`Session not found: ${args}`);
            }
          }
          setInputValue('');
          return;

        case 'rename':
          if (!args) {
            setSystemMessage('Usage: /rename <name>');
          } else {
            if (session.rename(args)) {
              setSystemMessage(`Session renamed to: ${args}`);
            } else {
              setSystemMessage('No active session to rename.');
            }
          }
          setInputValue('');
          return;

        case 'fork':
          const forked = session.fork(args || undefined);
          if (forked) {
            setSystemMessage(`Forked to: ${forked.name ?? forked.id}`);
          } else {
            setSystemMessage('No active session to fork.');
          }
          setInputValue('');
          return;

        case 'model':
          setSystemMessage(`Current model tier: ${chat.currentTier}`);
          setInputValue('');
          return;

        case 'skills': {
          const skills = listSkillNames();
          if (skills.length === 0) {
            setSystemMessage('No skills found.\n\nCreate skills in .10x/skills/ or ~/.config/10x/skills/');
          } else {
            const formatted = skills.map((s) => `  /${s}`).join('\n');
            setSystemMessage(`Available skills:\n${formatted}\n\nInvoke with: /<skill-name> [args]`);
          }
          setInputValue('');
          return;
        }

        case 'superpowers': {
          const triggers = listSuperpowerTriggers();
          if (triggers.length === 0) {
            setSystemMessage('No superpowers found.\n\nCreate superpowers in .10x/superpowers/ or ~/.config/10x/superpowers/');
          } else {
            const formatted = triggers.map((t) => `  ${t}`).join('\n');
            setSystemMessage(`Available superpowers (multi-step workflows):\n${formatted}\n\nInvoke with: /<superpower> [args]`);
          }
          setInputValue('');
          return;
        }

        case 'image': {
          if (!args) {
            setSystemMessage('Usage: /image <path> [prompt]\n\nExample: /image screenshot.png What does this show?');
            setInputValue('');
            return;
          }

          // Parse: first arg is file path, rest is prompt
          const imageParts = args.split(/\s+/);
          const imagePath = imageParts[0];
          const imagePrompt = imageParts.slice(1).join(' ') || 'Describe this image in detail.';

          // Resolve path
          const resolvedPath = imagePath.startsWith('/') ? imagePath : resolve(process.cwd(), imagePath);

          if (!existsSync(resolvedPath)) {
            setSystemMessage(`Image not found: ${imagePath}`);
            setInputValue('');
            return;
          }

          if (!isImageFile(resolvedPath)) {
            setSystemMessage(`Not a supported image format: ${imagePath}\nSupported: png, jpg, jpeg, gif, webp`);
            setInputValue('');
            return;
          }

          try {
            // Create multimodal content with image and text
            const multimodalContent = [
              createTextPart(`[Image: ${imagePath}]\n\n${imagePrompt}`),
              createImagePart(resolvedPath),
            ];

            // Send as a multimodal message
            setInputValue('');
            setShowWelcome(false);
            session.addMessage({ role: 'user', content: `/image ${args}` });

            // Send the multimodal message to the chat
            await chat.sendMessage(multimodalContent);

            const lastMsg = chat.messages[chat.messages.length - 1];
            if (lastMsg?.role === 'assistant') {
              session.addMessage(lastMsg);
            }
          } catch (error) {
            setSystemMessage(`Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setInputValue('');
          }
          return;
        }

        case 'quit':
        case 'exit':
          exit();
          return;

        default: {
          // Check if this is a skill invocation
          const skill = getSkill(command);
          if (skill) {
            // Invoke the skill by sending its content as context + user args
            const skillPrompt = args
              ? `${skill.content}\n\nUser request: ${args}`
              : skill.content;

            setInputValue('');
            setShowWelcome(false);
            session.addMessage({ role: 'user', content: `/${command} ${args}`.trim() });
            await chat.sendMessage(skillPrompt);

            const lastMsg = chat.messages[chat.messages.length - 1];
            if (lastMsg?.role === 'assistant') {
              session.addMessage(lastMsg);
            }
            return;
          }

          // Check if this is a superpower invocation
          const superpower = getSuperpower(command);
          if (superpower) {
            // Build a prompt that describes the superpower workflow
            const stepsDescription = superpower.steps
              .map((s) => `Step ${s.number}: ${s.name} (using ${s.model} model)\n${s.prompt}`)
              .join('\n\n---\n\n');

            const superpowerPrompt = `You are executing the "${superpower.name}" superpower - a multi-step workflow.

${superpower.description}

Follow these steps in order:

${stepsDescription}

---

User's request: ${args || 'Execute this workflow'}

Execute each step thoroughly, showing your work for each step. Use the tools available to complete each step before moving to the next.`;

            setInputValue('');
            setShowWelcome(false);
            session.addMessage({ role: 'user', content: `/${command} ${args}`.trim() });
            await chat.sendMessage(superpowerPrompt);

            const lastMsg = chat.messages[chat.messages.length - 1];
            if (lastMsg?.role === 'assistant') {
              session.addMessage(lastMsg);
            }
            return;
          }

          setSystemMessage(`Unknown command: /${command}. Type /help for commands.`);
          setInputValue('');
          return;
        }
      }
    }

    // Send message via chat hook
    setInputValue('');

    // Track in session
    session.addMessage({ role: 'user', content: value });

    // Parse for @file image references
    const parsed = parseMessageWithImages(value, process.cwd());

    if (parsed.hasImages) {
      // Send multimodal message
      await chat.sendMessage(parsed.content);
    } else {
      // Send regular text message
      await chat.sendMessage(value);
    }

    // Track response in session (simplified - just track that we got a response)
    const lastMsg = chat.messages[chat.messages.length - 1];
    if (lastMsg?.role === 'assistant') {
      session.addMessage(lastMsg);
    }
  };

  // Loading state
  if (appState === 'loading') {
    return (
      <Box padding={1}>
        <Text color={colors.ui.muted}>Loading...</Text>
      </Box>
    );
  }

  // API key prompt
  if (appState === 'need_api_key') {
    return (
      <Box flexDirection="column">
        <Box paddingX={1} paddingY={1}>
          <Text color={colors.brand.primary}>{banner}</Text>
        </Box>
        <ApiKeyPrompt
          onSubmit={handleApiKeySubmit}
          onCancel={handleApiKeyCancel}
        />
      </Box>
    );
  }

  // Main app
  return (
    <Box flexDirection="column" height="100%">
      <StatusBar
        modelTier={chat.currentTier}
        sessionName={session.session?.name}
        isStreaming={chat.isStreaming}
        tokenUsage={chat.tokenUsage}
        byok={byok}
      />

      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {showWelcome && chat.messages.length === 0 ? (
          <Box flexDirection="column" marginY={1}>
            <Text color={colors.brand.primary}>{banner}</Text>
            <Text>{'\n'}</Text>
            <Text>{welcomeMessage(chat.currentTier)}</Text>
          </Box>
        ) : (
          <MessageList
            messages={chat.messages}
            isStreaming={chat.isStreaming}
          />
        )}

        {systemMessage && (
          <Box marginY={1} paddingLeft={2}>
            <Text color={colors.ui.muted}>{systemMessage}</Text>
          </Box>
        )}

        {chat.error && (
          <Box marginY={1}>
            <Text color={colors.semantic.error}>Error: {chat.error}</Text>
          </Box>
        )}

        {permissions.pendingRequest && (
          <PermissionPrompt
            tool={permissions.pendingRequest.tool}
            input={permissions.pendingRequest.input}
            context={permissions.pendingRequest.context}
            onResponse={permissions.respond}
          />
        )}
      </Box>

      <InputArea
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        disabled={chat.isStreaming || !!permissions.pendingRequest}
      />
    </Box>
  );
}
