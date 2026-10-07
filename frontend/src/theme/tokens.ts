export type ThemeMode = 'invente' | 'dark' | 'light';

export type ProvenanceType = 'measured' | 'derived' | 'scenario' | 'Measured' | 'Derived' | 'Scenario';

export const provenanceColor: Record<string, string> = {
  measured: '#78dbf6',
  derived: '#f364cb',
  scenario: '#ffd23f',
  Measured: '#78dbf6',
  Derived: '#f364cb',
  Scenario: '#ffd23f',
};

export const palette = {
  bg: {
    base: '#f3f3ed',
    card: '#ffffff',
    border: '#000000',
    shadow: '#000000',
    gridLine: 'rgba(0, 0, 0, 0.08)',
  },
  accent: {
    yellow: '#ffd23f',
    lime: '#82e66f',
    pink: '#f364cb',
    cyan: '#54d6ff',
    white: '#ffffff',
    muted: '#e1e1d8',
  },
  text: {
    primary: '#000000',
    secondary: '#333333',
    muted: '#666666',
    inverse: '#ffffff',
  },
  quadrant: {
    scale: '#82e66f',
    protect: '#ffd23f',
    pause: '#f364cb',
    fix: '#54d6ff',
  },
  chart: {
    line: '#000000',
    grid: '#dddddd',
    fill: '#82e66f',
  }
};

export const quadrantMeta: Record<string, { label: string; action: string; color: string; bg: string; description: string }> = {
  scale: {
    label: 'SCALE',
    action: 'Increase Ad Spend',
    color: '#000000',
    bg: palette.accent.lime,
    description: 'High Margin, High Stock Cover (> 14 days)'
  },
  protect: {
    label: 'PROTECT',
    action: 'Throttle / Cap Spend',
    color: '#000000',
    bg: palette.accent.yellow,
    description: 'High Margin, Low Stock Cover (< 14 days)'
  },
  pause: {
    label: 'PAUSE',
    action: 'Pause / Kill Ad',
    color: '#000000',
    bg: palette.accent.pink,
    description: 'Low Margin (< 20%), Low Stock Cover'
  },
  fix: {
    label: 'FIX',
    action: 'Clearance / Reprice',
    color: '#000000',
    bg: palette.accent.cyan,
    description: 'Low Margin, High Stock Cover'
  }
};

export const shadows = {
  sm: '2px 2px 0px #000000',
  md: '3px 3px 0px #000000',
  lg: '5px 5px 0px #000000',
};

export const borders = {
  thin: '1px solid #000000',
  standard: '2px solid #000000',
  thick: '3px solid #000000',
};