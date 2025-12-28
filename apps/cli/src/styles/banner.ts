export const banner = `
 ██╗  ██████╗  ██╗  ██╗
███║ ██╔═████╗ ╚██╗██╔╝
╚██║ ██║██╔██║  ╚███╔╝
 ██║ ████╔╝██║  ██╔██╗
 ██║ ╚██████╔╝ ██╔╝ ██╗
 ╚═╝  ╚═════╝  ╚═╝  ╚═╝
`.trim();

export const bannerCompact = `
╔═╗ ╔═╗
║ ║ ║ ║ ═╗═╗
║ ║ ║ ║  ╔╝
║ ╚═╝ ║ ╔╝
╚═════╝ ════
`.trim();

export const tagline = 'code at 10x speed';

export const welcomeMessage = (model: string) =>
  `✦ Welcome to 10x — ${tagline}

  Model: ${model}
  Type /help for commands, or just start typing.`;

export const minimalWelcome = (model: string) =>
  `✦ 10x • ${model} • /help for commands`;
