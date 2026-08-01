export interface Theme {
  id: string
  label: string
  vars: Record<string, string>
  /** Swatch shown in the picker — usually the theme's background + accent. */
  swatch: [string, string]
}

export const THEMES: Theme[] = [
  {
    id: 'midnight',
    label: 'Midnight',
    swatch: ['#0b0e14', '#e8c14a'],
    vars: {
      '--color-ink-950': '#0b0e14',
      '--color-ink-900': '#10141d',
      '--color-ink-800': '#171c28',
      '--color-ink-700': '#212838',
      '--color-ink-600': '#2d3648',
      '--color-ink-500': '#47536b',
      '--color-ink-400': '#6b7690',
      '--color-ink-300': '#94a0b8',
      '--color-ink-200': '#c1c9db',
      '--color-ink-100': '#e4e8f1',
      '--color-caret': '#e8c14a',
      '--color-caret-dim': '#b89a3c',
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    swatch: ['#0e1512', '#7fd88f'],
    vars: {
      '--color-ink-950': '#0e1512',
      '--color-ink-900': '#131c18',
      '--color-ink-800': '#1a2620',
      '--color-ink-700': '#24352c',
      '--color-ink-600': '#31473c',
      '--color-ink-500': '#4c6b5a',
      '--color-ink-400': '#71937f',
      '--color-ink-300': '#9cb7a8',
      '--color-ink-200': '#c6d9cd',
      '--color-ink-100': '#e6efe9',
      '--color-caret': '#7fd88f',
      '--color-caret-dim': '#5cb26e',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    swatch: ['#160f14', '#f0895c'],
    vars: {
      '--color-ink-950': '#160f14',
      '--color-ink-900': '#1e1419',
      '--color-ink-800': '#291b24',
      '--color-ink-700': '#3a2432',
      '--color-ink-600': '#4f2f42',
      '--color-ink-500': '#764861',
      '--color-ink-400': '#a06e85',
      '--color-ink-300': '#c398a8',
      '--color-ink-200': '#e0c3cd',
      '--color-ink-100': '#f3e3e8',
      '--color-caret': '#f0895c',
      '--color-caret-dim': '#c96b43',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    swatch: ['#0a1420', '#6fb8e0'],
    vars: {
      '--color-ink-950': '#0a1420',
      '--color-ink-900': '#0f1c2c',
      '--color-ink-800': '#16283c',
      '--color-ink-700': '#1f3750',
      '--color-ink-600': '#2a4a68',
      '--color-ink-500': '#3f6d94',
      '--color-ink-400': '#6591b6',
      '--color-ink-300': '#96b7d2',
      '--color-ink-200': '#c4d8e9',
      '--color-ink-100': '#e6eef6',
      '--color-caret': '#6fb8e0',
      '--color-caret-dim': '#4f97be',
    },
  },
  {
    id: 'mono',
    label: 'Mono',
    swatch: ['#0c0c0c', '#e5e5e5'],
    vars: {
      '--color-ink-950': '#0c0c0c',
      '--color-ink-900': '#131313',
      '--color-ink-800': '#1c1c1c',
      '--color-ink-700': '#282828',
      '--color-ink-600': '#383838',
      '--color-ink-500': '#5a5a5a',
      '--color-ink-400': '#828282',
      '--color-ink-300': '#a8a8a8',
      '--color-ink-200': '#cccccc',
      '--color-ink-100': '#eeeeee',
      '--color-caret': '#e5e5e5',
      '--color-caret-dim': '#b8b8b8',
    },
  },
]

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

export function applyTheme(id: string, accentOverride?: string) {
  const theme = getTheme(id)
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }
  if (accentOverride) {
    root.style.setProperty('--color-caret', accentOverride)
  }
}
