export const palette = {
  bg: {
    base: '#f3f3ed',          // Blueprint Off-White Grid Paper
    gridLine: '#e1e1d8',      // Soft Slate Grid Lines
    card: '#ffffff',          // Pure White Neo-Brutalist Card
    border: '#000000',        // Heavy Ink Black Border
    shadow: '#000000',        // Hard Offset Drop Shadow
  },
  accent: {
    lime: '#82e66f',          // Invente Acid Green
    pink: '#f364cb',          // Bubblegum Hot Pink
    cyan: '#78dbf6',          // Electric Cyan
    yellow: '#ffd23f',        // Sunflower Yellow
    black: '#000000',
  },
  text: {
    primary: '#000000',
    secondary: '#333333',
    subtle: '#666666',
  }
};

// Backwards-compatible quadrant colors
export const colors = {
  bg:       '#0a0d14',
  surface:  '#111827',
  surface2: '#1a2235',
  border:   '#1f2d45',
  text:     '#e2e8f0',
  muted:    '#64748b',
  accent:   '#3b82f6',
  scale:    '#00ff88',
  protect:  '#ffb800',
  pause:    '#ff4466',
  fix:      '#a855f7',
} as const;

export const quadrantMeta = {
  scale:   { color: colors.scale,   label: 'Scale',   bg: 'rgba(0,255,136,0.1)' },
  protect: { color: colors.protect, label: 'Protect', bg: 'rgba(255,184,0,0.1)' },
  pause:   { color: colors.pause,   label: 'Pause',   bg: 'rgba(255,68,102,0.1)' },
  fix:     { color: colors.fix,     label: 'Fix',     bg: 'rgba(168,85,247,0.1)' },
} as const;
