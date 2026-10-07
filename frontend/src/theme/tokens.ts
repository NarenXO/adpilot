// theme/tokens.ts — Invente '26 Neo-Brutalist design system tokens

/** Master palette — shared with integration shell */
export const palette = {
  bg: {
    base:     '#f3f3ed',   // Blueprint Off-White Grid Paper
    gridLine: '#e1e1d8',   // Soft Slate Grid Lines
    card:     '#ffffff',   // Pure White Neo-Brutalist Card
    border:   '#000000',   // Heavy Ink Black Border
    shadow:   '#000000',   // Hard Offset Drop Shadow
  },
  accent: {
    lime:   '#82e66f',     // Scale quadrant — Invente Acid Green
    pink:   '#f364cb',     // Pause quadrant — Bubblegum Hot Pink
    cyan:   '#78dbf6',     // Fix quadrant — Electric Cyan
    yellow: '#ffd23f',     // Protect quadrant — Sunflower Yellow
    black:  '#000000',
  },
  text: {
    primary:   '#000000',
    secondary: '#333333',
    subtle:    '#666666',
  },
};

/** Flat color aliases used by InventoryMargin & BubbleChart */
export const colors = {
  bg:       palette.bg.base,
  surface:  palette.bg.card,
  surface2: '#f3f3ed',
  border:   palette.bg.border,
  text:     palette.text.primary,
  muted:    palette.text.subtle,
  accent:   palette.accent.lime,
  // quadrant colors
  scale:   palette.accent.lime,
  protect: palette.accent.yellow,
  pause:   palette.accent.pink,
  fix:     palette.accent.cyan,
} as const;

export const quadrantMeta = {
  scale:   { color: colors.scale,   label: 'Scale',   bg: 'rgba(130,230,111,0.12)' },
  protect: { color: colors.protect, label: 'Protect', bg: 'rgba(255,210,63,0.12)'  },
  pause:   { color: colors.pause,   label: 'Pause',   bg: 'rgba(243,100,203,0.12)' },
  fix:     { color: colors.fix,     label: 'Fix',     bg: 'rgba(120,219,246,0.12)' },
} as const;
