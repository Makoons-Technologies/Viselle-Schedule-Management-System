import { isSubdomainBookingHost } from '@/lib/subdomain-booking';

export type ColorMode = 'light' | 'dark' | 'system';
export type ResolvedColorMode = 'light' | 'dark';

export const COLOR_MODE_STORAGE_KEY = 'viselle-color-mode';
export const DEFAULT_COLOR_MODE: ColorMode = 'system';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

/** Guest booking UI must stay light so Chrome autofill cannot paint inputs black. */
let lightColorSchemeLocks = 0;

export function isPublicBookingPath(pathname: string): boolean {
  return pathname === '/book' || pathname.startsWith('/book/');
}

export function isPublicBookingLocation(): boolean {
  if (typeof window === 'undefined') return false;
  return isPublicBookingPath(window.location.pathname) || isSubdomainBookingHost();
}

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
  const forceLight = lightColorSchemeLocks > 0;
  const dark = !forceLight && resolved === 'dark';
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  if (forceLight) {
    root.setAttribute('data-booking-ui', 'light');
  } else {
    root.removeAttribute('data-booking-ui');
  }
}

/** Keep html.dark / color-scheme:dark off until the matching unlock runs. */
export function lockLightColorScheme(): () => void {
  lightColorSchemeLocks += 1;
  applyResolvedColorMode(resolveColorMode(readStoredColorMode()));
  return () => {
    lightColorSchemeLocks = Math.max(0, lightColorSchemeLocks - 1);
    applyResolvedColorMode(resolveColorMode(readStoredColorMode()));
  };
}

export function initColorMode(): ColorMode {
  const mode = readStoredColorMode();
  if (isPublicBookingLocation()) {
    applyResolvedColorMode('light');
    return mode;
  }
  applyResolvedColorMode(resolveColorMode(mode));
  return mode;
}

export function subscribeToSystemColorMode(onChange: (resolved: ResolvedColorMode) => void): () => void {
  const media = window.matchMedia(MEDIA_QUERY);
  const handler = () => onChange(media.matches ? 'dark' : 'light');
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
