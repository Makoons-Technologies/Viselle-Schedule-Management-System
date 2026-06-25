export type ColorMode = 'light' | 'dark' | 'system';
export type ResolvedColorMode = 'light' | 'dark';

export const COLOR_MODE_STORAGE_KEY = 'viselle-color-mode';
export const DEFAULT_COLOR_MODE: ColorMode = 'system';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

export function getSystemColorMode(): ResolvedColorMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

export function resolveColorMode(mode: ColorMode): ResolvedColorMode {
  if (mode === 'system') return getSystemColorMode();
  return mode;
}

export function readStoredColorMode(): ColorMode {
  if (typeof window === 'undefined') return DEFAULT_COLOR_MODE;
  const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return DEFAULT_COLOR_MODE;
}

export function applyResolvedColorMode(resolved: ResolvedColorMode): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
}

export function initColorMode(): ColorMode {
  const mode = readStoredColorMode();
  applyResolvedColorMode(resolveColorMode(mode));
  return mode;
}

export function subscribeToSystemColorMode(onChange: (resolved: ResolvedColorMode) => void): () => void {
  const media = window.matchMedia(MEDIA_QUERY);
  const handler = () => onChange(media.matches ? 'dark' : 'light');
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
