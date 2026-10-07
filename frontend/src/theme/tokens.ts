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

