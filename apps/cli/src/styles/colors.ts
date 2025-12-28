export const colors = {
  // Brand
  brand: {
    primary: '#0EA5E9',      // Electric Blue (Sky 500)
    light: '#38BDF8',        // Sky 400
    dark: '#0284C7',         // Sky 600
  },

  // Model Tiers (speed gradient: light → saturated)
  tier: {
    superfast: '#22D3EE',    // Cyan - lightning fast
    fast: '#38BDF8',         // Light blue - quick
    smart: '#0EA5E9',        // Brand blue - full power
  },

  // Semantic
  semantic: {
    success: '#22C55E',      // Green 500
    warning: '#F59E0B',      // Amber 500
    error: '#EF4444',        // Red 500
    info: '#3B82F6',         // Blue 500
  },

  // UI Chrome
  ui: {
    background: '#0A0A0A',   // Near black
    surface: '#171717',      // Neutral 900
    border: '#404040',       // Neutral 600
    muted: '#737373',        // Neutral 500
    text: '#FAFAFA',         // Neutral 50
    textSecondary: '#A3A3A3', // Neutral 400
  },

  // Syntax Highlighting (VS Code Dark+ inspired)
  syntax: {
    keyword: '#569CD6',      // Blue
    string: '#CE9178',       // Orange
    number: '#B5CEA8',       // Light green
    comment: '#6A9955',      // Green
    function: '#DCDCAA',     // Yellow
    variable: '#9CDCFE',     // Light blue
    type: '#4EC9B0',         // Teal
    operator: '#D4D4D4',     // Gray
  },
} as const;

export type Colors = typeof colors;
