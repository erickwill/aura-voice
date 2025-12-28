<h1 align="center">10x</h1>

<p align="center">
  <b>The AI Coding Agent with Structural Integrity</b>
</p>

<p align="center">
  <a href="https://github.com/10x-dev/10x/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://www.npmjs.com/package/@10x/cli"><img src="https://img.shields.io/npm/v/@10x/cli.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@10x/cli"><img src="https://img.shields.io/npm/dm/@10x/cli.svg" alt="Downloads"></a>
  <a href="https://github.com/10x-dev/10x"><img src="https://img.shields.io/github/stars/10x-dev/10x?style=social" alt="GitHub stars"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#superpowers">Superpowers</a> •
  <a href="#features">Features</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="media/header.webp" alt="10x - AI coding assistant that deeply understands your codebase" width="100%">
</p>

---

> **If you find 10x useful, please consider giving it a star!** Your support helps us grow and improve the project.

---

## Why 10x?

| Feature | 10x | Claude Code | Cursor | GitHub Copilot |
|---------|-----|-------------|--------|----------------|
| **Superpowers (Multi-Step Pipelines)** | Chain models for complex workflows | No | No | No |
| **Smart Model Routing** | Auto-picks fastest model per task | Single model | Single model | Single model |
| **Token Speed** | Up to 1000 TPS with routing | ~50 TPS | Varies | Varies |
| **Open Source** | MIT Licensed | Closed source | Closed source | Closed source |
| **BYOK (Bring Your Own Key)** | Full control over costs | Subscription only | Subscription only | Subscription only |
| **Custom Skills** | Create reusable workflows | Limited | Limited | No |
| **Session Memory** | Persistent conversations | Limited context | Limited context | No memory |
| **Self-Hosted** | Run anywhere | Cloud only | Cloud only | Cloud only |

## Quick Start

```bash
# Install globally
bun install -g @10x/cli

# Run with your OpenRouter API key
10x --byok

# Or set the key via environment variable
export OPENROUTER_API_KEY=sk-or-...
10x
```

## Superpowers

**Superpowers are multi-step AI workflows that chain different models together for complex tasks.** Each step can use a different model tier, automatically routing to the fastest model that can handle that step.

### Built-in Superpowers

| Command | Description |
|---------|-------------|
| `/review <path>` | Comprehensive code review with security, performance, and style analysis |
| `/pr` | Generate PR description from staged/committed changes |
| `/refactor <file>` | Guided refactoring with analysis, suggestions, and implementation |
| `/debug <issue>` | Step-by-step debugging: reproduce, analyze, fix |
| `/explain <path>` | Deep dive explanation of code architecture and flow |
| `/test <file>` | Generate comprehensive test suite for a file |

### How Superpowers Work

```
┌─────────────────────────────────────────────────────────────────┐
│  /review src/auth/                                              │
├─────────────────────────────────────────────────────────────────┤
│  Step 1: Scan & Understand (⚡⚡ superfast)                      │
│  → Read files, identify patterns, map dependencies              │
├─────────────────────────────────────────────────────────────────┤
│  Step 2: Deep Analysis (◆ smart)                                │
│  → Security audit, performance review, architecture feedback    │
├─────────────────────────────────────────────────────────────────┤
│  Step 3: Generate Report (⚡ fast)                               │
│  → Compile findings into actionable recommendations             │
└─────────────────────────────────────────────────────────────────┘
```

### Create Your Own Superpowers

Define custom multi-step workflows in `.10x/superpowers/` or `~/.config/10x/superpowers/`:

```markdown
---
name: debug
description: Debug an issue step by step
trigger: /debug
---

## Step 1: Understand the Issue (model: fast)

{{input}}

Find and read the relevant code files.

## Step 2: Analyze Root Cause (model: smart)

Based on the code:
{{previous}}

Identify the root cause of the issue.

## Step 3: Implement Fix (model: smart)

{{step2}}

Implement a fix for the issue.
```

**Variables available:**
- `{{input}}` — The user's original input
- `{{previous}}` — Output from the previous step
- `{{step1}}`, `{{step2}}`, etc. — Output from specific steps

## Features

- **Superpowers** — Multi-step AI pipelines that chain models for complex workflows
- **Smart Model Routing** — Automatically selects the fastest model for each task
- **Custom Skills** — Create reusable prompts and workflows
- **Powerful Tools** — Read, write, edit files, search with glob & grep, run bash commands
- **Session Memory** — Persistent conversations with SQLite, auto-compaction
- **Image Understanding** — Analyze screenshots and diagrams with vision models
- **BYOK Mode** — Bring your own OpenRouter API key for full cost control
- **Execute Mode** — Non-interactive scripting with `-x`
- **Open Source** — MIT licensed, fully auditable

## Model Tiers

10x automatically selects the best model based on task complexity:

| Tier | Model | Speed | Best For |
|------|-------|-------|----------|
| ⚡⚡ Superfast | GPT OSS 20B | ~1000 TPS | Simple queries, explanations |
| ⚡ Fast | Kimi K2 1T | ~200 TPS | Code generation, refactoring |
| ◆ Smart | Claude Opus 4 | ~50 TPS | Complex reasoning, architecture |

## Commands

### Built-in Commands

```
/help              Show available commands
/clear             Clear conversation
/model             Show current model tier
/sessions          List recent sessions
/resume <name>     Resume a session
/rename <name>     Rename current session
/fork [name]       Fork current session
/skills            List available skills
/superpowers       List multi-step workflows
/image <file>      Analyze an image
/quit              Exit 10x
```

### Image Analysis

```bash
# Using the /image command
/image screenshot.png What does this UI show?

# Or reference images inline with @
Explain the architecture in @diagram.png
```

## Execute Mode

Run single prompts non-interactively:

```bash
# Simple query
10x -x "explain what this file does" < src/main.ts

# With piped input
cat error.log | 10x -x "explain this error"

# Quiet mode (just the response)
10x -x "list all TODO comments" -q
```

## Configuration

### 10X.md Guidance Files

Create a `10X.md` file in your project root to give 10x context:

```markdown
# Project: MyApp

## Tech Stack
- TypeScript, React, Node.js
- PostgreSQL with Drizzle ORM

## Conventions
- Use functional components with hooks
- Prefer named exports
- Tests go in __tests__ directories
```

10x reads `10X.md` files from:
1. `~/.config/10x/10X.md` (global)
2. Any `10X.md` in parent directories
3. `./10X.md` (project root)

### Custom Skills

Create reusable prompts in `.10x/skills/` or `~/.config/10x/skills/`:

```markdown
---
name: commit
description: Generate a commit message
---

Analyze the staged changes and generate a conventional commit message.
Follow the format: type(scope): description
```

Invoke with `/<skill-name>`:

```bash
/commit
```

### Permissions

Configure tool permissions in `~/.config/10x/settings.json`:

```json
{
  "permissions": {
    "read": { "default": "allow" },
    "write": { "default": "ask" },
    "bash": {
      "default": "ask",
      "rules": [
        { "pattern": "git *", "action": "allow" },
        { "pattern": "npm test", "action": "allow" },
        { "pattern": "sudo *", "action": "deny" }
      ]
    }
  }
}
```

## CLI Options

```
Usage: 10x [options]

Options:
  -V, --version          Output version number
  --byok                 Use your own OpenRouter API key
  --model <tier>         Set model tier (superfast, fast, smart)
  --resume <name>        Resume a session by name or ID
  --continue             Continue the last session
  -x, --execute <prompt> Execute a single prompt and exit
  -q, --quiet            Quiet mode (only output response)
  -h, --help             Display help
```

## Requirements

- [Bun](https://bun.sh) >= 1.0
- [ripgrep](https://github.com/BurntSushi/ripgrep) (for grep tool)
- OpenRouter API key ([openrouter.ai](https://openrouter.ai))

## Development

```bash
git clone https://github.com/10x-dev/10x.git
cd 10x
bun install
bun run build
cd apps/cli && bun run dev
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `bun run test`
5. Submit a PR

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>If 10x helps you code faster, give it a ⭐ on GitHub!</b>
</p>
