// Gradient banner - each line can be styled with different colors
// Lines are split for per-line gradient coloring (cyan → blue → purple)
export const bannerLines = [
  ' ██╗  ██████╗  ██╗  ██╗',
  '███║ ██╔═████╗ ╚██╗██╔╝',
  '╚██║ ██║██╔██║  ╚███╔╝ ',
  ' ██║ ████╔╝██║  ██╔██╗ ',
  ' ██║ ╚██████╔╝ ██╔╝ ██╗',
  ' ╚═╝  ╚═════╝  ╚═╝  ╚═╝',
];

// Legacy single-string banner for fallback
export const banner = bannerLines.join('\n');

export const bannerCompact = `
╔═╗ ╔═╗
║ ║ ║ ║ ═╗═╗
║ ║ ║ ║  ╔╝
║ ╚═╝ ║ ╔╝
╚═════╝ ════
`.trim();

export const tagline = 'code at 10x speed';

export const welcomeMessage = (model: string) =>
  `→ Welcome to 10x — ${tagline}

  Model: ${model}
  Type /help for commands, or just start typing.`;

export const minimalWelcome = (model: string) =>
  `→ 10x • ${model} • /help for commands`;
