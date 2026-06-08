export type PlatformThemeId = 'rose' | 'ocean' | 'violet' | 'forest' | 'amber' | 'slate';

export interface PlatformTheme {
  id: PlatformThemeId;
  name: string;
  description: string;
  colors: {
    50: string;
    100: string;
    200: string;
    300: string;
    500: string;
    600: string;
    700: string;
    900: string;
  };
}

export const PLATFORM_THEMES: PlatformTheme[] = [
  {
    id: 'rose',
    name: 'Rose',
    description: 'Soft pink accent',
    colors: {
      50: '#fdf4f8',
      100: '#fbe8f2',
      200: '#f6d0e4',
      300: '#eda8c8',
      500: '#c45b8a',
      600: '#a84372',
      700: '#8a335d',
      900: '#4a1a32',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calm blue accent',
    colors: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      900: '#1e3a5f',
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'Rich purple accent',
    colors: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      900: '#3b0764',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green accent',
    colors: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      900: '#064e3b',
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    description: 'Warm gold accent',
    colors: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      900: '#78350f',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Neutral gray-blue accent',
    colors: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      900: '#0f172a',
    },
  },
];

export const DEFAULT_THEME_ID: PlatformThemeId = 'rose';

export const THEME_STORAGE_KEY = 'viselle-platform-theme';

export function getThemeById(id: PlatformThemeId): PlatformTheme {
  return PLATFORM_THEMES.find((t) => t.id === id) ?? PLATFORM_THEMES[0];
}

export function applyPlatformTheme(id: PlatformThemeId): void {
  const theme = getThemeById(id);
  const root = document.documentElement;
  for (const [shade, color] of Object.entries(theme.colors)) {
    root.style.setProperty(`--color-brand-${shade}`, color);
  }
}

export function readStoredThemeId(): PlatformThemeId {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored && PLATFORM_THEMES.some((t) => t.id === stored)) {
    return stored as PlatformThemeId;
  }
  return DEFAULT_THEME_ID;
}
