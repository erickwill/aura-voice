<h1 align="center">10x</h1>

<p align="center">
  <b>Up to 20x faster coding - with Superpowers.</b>
</p>

<p align="center">
  <a href="https://github.com/0xCrunchyy/10x/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://www.npmjs.com/package/@10x/cli"><img src="https://img.shields.io/npm/v/@10x/cli.svg" alt="npm version"></a>
  <a href="https://github.com/0xCrunchyy/10x"><img src="https://img.shields.io/github/stars/0xCrunchyy/10x?style=social" alt="GitHub stars"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#superpowers">Superpowers</a> •
  <a href="#features">Features</a> •
  <a href="#configuration">Configuration</a>
</p>

<p align="center">
  <img src="media/header.webp" alt="10x - Up to 20x faster, with Superpowers" width="100%">
</p>

---

## Why 10x?

| Feature | 10x | Claude Code | Cursor | GitHub Copilot |
|---------|-----|-------------|--------|----------------|
| **Superpowers (Multi-Step Pipelines)** | Chain models for complex workflows | No | No | No |
| **Smart Model Routing** | Auto-picks fastest model per task | Single model | Single model | Single model |
| **Speed** | Up to 20x faster | 1x | ~1x | ~1x |
| **Open Source** | MIT Licensed | Closed source | Closed source | Closed source |
| **BYOK (Bring Your Own Key)** | Full control over costs | Subscription only | Subscription only | Subscription only |

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
| `/review <path>` | Code review with security, performance, and style analysis |
| `/pr` | Generate PR description from staged/committed changes |
| `/refactor <file>` | Guided refactoring with analysis and implementation |
| `/debug <issue>` | Step-by-step debugging: reproduce, analyze, fix |
| `/explain <path>` | Deep dive explanation of code architecture |
| `/test <file>` | Generate comprehensive test suite |

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
Based on the code: {{previous}}
Identify the root cause of the issue.

## Step 3: Implement Fix (model: smart)
{{step2}}
Implement a fix for the issue.
```

**Variables:** `{{input}}`, `{{previous}}`, `{{step1}}`, `{{step2}}`, etc.

## Features

- **Superpowers** — Multi-step AI pipelines that chain models
- **Smart Model Routing** — Automatically selects the fastest model for each task
- **Custom Skills** — Create reusable prompts and workflows
- **Powerful Tools** — Read, write, edit files, search with glob & grep, run bash
- **Session Memory** — Persistent conversations with SQLite
- **Image Understanding** — Analyze screenshots and diagrams
- **BYOK Mode** — Bring your own OpenRouter API key
- **Execute Mode** — Non-interactive scripting with `-x`

## Model Tiers

| Tier | Model | Speed | Best For |
|------|-------|-------|----------|
| ⚡⚡ Superfast | GPT OSS 20B | 20x | Simple queries, explanations |
| ⚡ Fast | Kimi K2 1T | 4x | Code generation, refactoring |
| ◆ Smart | Claude Opus 4 | 1x | Complex reasoning, architecture |

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
```

### Custom Skills

Create reusable prompts in `.10x/skills/` or `~/.config/10x/skills/`:

```markdown
---
name: commit
description: Generate a commit message
---

Analyze the staged changes and generate a conventional commit message.
```

Invoke with `/<skill-name>`: `/commit`

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

## License

MIT License - see [LICENSE](LICENSE) for details.
