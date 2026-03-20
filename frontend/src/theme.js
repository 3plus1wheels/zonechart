export const THEME_PRESETS = {
  classic: {
    label: 'Classic Ivory',
    colors: {
      color_primary: '#0d0d12',
      color_accent: '#c9a84c',
      color_background: '#faf8f5',
      color_surface: '#f2eee7',
      color_card: '#fffcf7',
      color_text: '#2a2a35',
      color_muted: '#6c6c78',
    },
  },
  ocean: {
    label: 'Ocean Slate',
    colors: {
      color_primary: '#102a43',
      color_accent: '#3fa7d6',
      color_background: '#f4f8fb',
      color_surface: '#e4eef5',
      color_card: '#ffffff',
      color_text: '#243b53',
      color_muted: '#486581',
    },
  },
  forest: {
    label: 'Forest Mint',
    colors: {
      color_primary: '#1f3d2f',
      color_accent: '#5fbf8f',
      color_background: '#f5faf7',
      color_surface: '#e7f2ec',
      color_card: '#ffffff',
      color_text: '#26352d',
      color_muted: '#4f6b5b',
    },
  },
};

export const DEFAULT_THEME = {
  preset: 'classic',
  ...THEME_PRESETS.classic.colors,
};

const HEX_FIELDS = [
  'color_primary',
  'color_accent',
  'color_background',
  'color_surface',
  'color_card',
  'color_text',
  'color_muted',
];

export function isValidHex(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(value || '');
}

export function normalizeTheme(rawTheme) {
  const base = { ...DEFAULT_THEME };
  if (!rawTheme || typeof rawTheme !== 'object') return base;

  const preset = typeof rawTheme.preset === 'string' ? rawTheme.preset : base.preset;
  base.preset = preset;

  HEX_FIELDS.forEach((field) => {
    const value = rawTheme[field];
    if (typeof value === 'string' && isValidHex(value)) {
      base[field] = value.toLowerCase();
    }
  });

  return base;
}

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyTheme(theme) {
  const normalized = normalizeTheme(theme);
  const root = document.documentElement;

  root.style.setProperty('--color-primary', normalized.color_primary);
  root.style.setProperty('--color-accent', normalized.color_accent);
  root.style.setProperty('--color-background', normalized.color_background);
  root.style.setProperty('--color-surface', normalized.color_surface);
  root.style.setProperty('--color-card', normalized.color_card);
  root.style.setProperty('--color-text', normalized.color_text);
  root.style.setProperty('--color-muted', normalized.color_muted);
  root.style.setProperty('--color-border', hexToRgba(normalized.color_primary, 0.12));

  return normalized;
}

export const THEME_HEX_FIELDS = HEX_FIELDS;
