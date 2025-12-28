# 10x

> AI coding assistant — code at 10x speed.

```
 ██╗  ██████╗  ██╗  ██╗
███║ ██╔═████╗ ╚██╗██╔╝
╚██║ ██║██╔██║  ╚███╔╝
 ██║ ████╔╝██║  ██╔██╗
 ██║ ╚██████╔╝ ██╔╝ ██╗
 ╚═╝  ╚═════╝  ╚═╝  ╚═╝
```

10x is an open-source AI coding assistant that runs in your terminal. It automatically routes tasks to the best model for speed and cost efficiency, gives you powerful tools for reading/writing files and running commands, and remembers your conversation across sessions.

## Features

- **Smart Model Routing** — Automatically selects the fastest model for each task
- **Powerful Tools** — Read, write, edit files, search with glob & grep, run bash commands
- **Session Memory** — Persistent conversations with SQLite, auto-compaction
- **Skills & Superpowers** — Custom workflows and multi-step AI pipelines
- **Image Understanding** — Analyze screenshots and diagrams with vision models
- **BYOK Mode** — Bring your own OpenRouter API key
- **Execute Mode** — Non-interactive scripting with `-x`
- **Open Source** — MIT licensed

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

Analyze images using vision models:

```bash
# Using the /image command
/image screenshot.png What does this UI show?

# Or reference images inline with @
Explain the architecture in @diagram.png
```

### Superpowers (Multi-Step Workflows)

Superpowers are pre-built multi-step AI workflows:

```bash
/review src/          # Comprehensive code review
/pr                   # Generate PR description from changes
/refactor utils.ts    # Guided refactoring workflow
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

Create a `10X.md` file in your project root to give 10x context about your project:

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

10x automatically reads `10X.md` files from:
1. `~/.config/10x/10X.md` (global)
2. Any `10X.md` in parent directories
3. `./10X.md` (project root)

### Custom Skills

Create reusable prompts as skills in `.10x/skills/` or `~/.config/10x/skills/`:

```markdown
---
name: commit
description: Generate a commit message
---

Analyze the staged changes and generate a conventional commit message.
Follow the format: type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
```

Invoke with `/<skill-name>`:

```bash
/commit
```

### Custom Superpowers

Create multi-step workflows in `.10x/superpowers/` or `~/.config/10x/superpowers/`:

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

## Development

```bash
# Clone the repo
git clone https://github.com/10x-dev/10x.git
cd 10x

# Install dependencies
bun install

# Build all packages
bun run build

# Run CLI in development
cd apps/cli && bun run dev

# Run the built CLI
./apps/cli/dist/index.js --byok
```

### Project Structure

```
10x/
├── apps/
│   ├── cli/              # CLI application (Ink + React)
│   │   ├── src/
│   │   │   ├── components/   # UI components
│   │   │   ├── hooks/        # React hooks
│   │   │   └── styles/       # Colors, banner
│   │   └── dist/             # Built output
│   └── web/              # Web app (Next.js)
│       └── src/
│           ├── app/          # App router pages
│           └── lib/          # Database, auth
├── packages/
│   ├── core/             # Core logic
│   │   └── src/
│   │       ├── providers/    # OpenRouter client
│   │       ├── router/       # Model routing
│   │       ├── tools/        # Read, write, edit, glob, grep, bash
│   │       ├── sessions/     # Session management
│   │       ├── permissions/  # Permission system
│   │       ├── guidance/     # 10X.md loader
│   │       ├── skills/       # Skill loader
│   │       ├── superpowers/  # Superpower system
│   │       └── multimodal/   # Image handling
│   └── shared/           # Shared types
└── superpowers/          # Built-in superpowers
```

### Running Tests

```bash
bun run test
```

## Requirements

- [Bun](https://bun.sh) >= 1.0
- [ripgrep](https://github.com/BurntSushi/ripgrep) (for grep tool)
- OpenRouter API key (get one at [openrouter.ai](https://openrouter.ai))

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |

## Troubleshooting

### "ripgrep not found"

Install ripgrep for the grep tool to work:

```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
apt install ripgrep

# Windows
choco install ripgrep
```

### API Key Issues

1. Make sure your OpenRouter API key starts with `sk-or-`
2. Verify the key is valid at [openrouter.ai/keys](https://openrouter.ai/keys)
3. Check you have credits available

### Session Issues

Sessions are stored in `~/.config/10x/sessions.db`. To reset:

```bash
rm ~/.config/10x/sessions.db
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

## Acknowledgments

- [OpenRouter](https://openrouter.ai) for model API access
- [Ink](https://github.com/vadimdemedes/ink) for the terminal UI framework
- [Anthropic](https://anthropic.com) for Claude models

---

**Star this repo if you find it useful!**
