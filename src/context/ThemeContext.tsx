import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  applyPlatformTheme,
  PLATFORM_THEMES,
  readStoredThemeId,
  THEME_STORAGE_KEY,
  type PlatformThemeId,
} from '@/lib/themes';
import {
  applyResolvedColorMode,
  COLOR_MODE_STORAGE_KEY,
  isPublicBookingPath,
  lockLightColorScheme,
  readStoredColorMode,
  resolveColorMode,
  subscribeToSystemColorMode,
  type ColorMode,
  type ResolvedColorMode,
} from '@/lib/color-mode';
import { isSubdomainBookingHost } from '@/lib/subdomain-booking';

interface ThemeContextValue {
  themeId: PlatformThemeId;
  setThemeId: (id: PlatformThemeId) => void;
  themes: typeof PLATFORM_THEMES;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  resolvedColorMode: ResolvedColorMode;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [themeId, setThemeIdState] = useState<PlatformThemeId>(() => readStoredThemeId());
  const [colorMode, setColorModeState] = useState<ColorMode>(() => readStoredColorMode());
  const [resolvedColorMode, setResolvedColorMode] = useState<ResolvedColorMode>(() =>
    resolveColorMode(readStoredColorMode()),
  );
  const forceLightBookingUi = isSubdomainBookingHost() || isPublicBookingPath(pathname);

  useLayoutEffect(() => {
    if (!forceLightBookingUi) return;
    return lockLightColorScheme();
  }, [forceLightBookingUi]);

  useEffect(() => {
    applyPlatformTheme(themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
    const resolved = resolveColorMode(colorMode);
    setResolvedColorMode(resolved);
    applyResolvedColorMode(resolved);
  }, [colorMode]);

  useEffect(() => {
    if (colorMode !== 'system') return;
    return subscribeToSystemColorMode((resolved) => {
      setResolvedColorMode(resolved);
      applyResolvedColorMode(resolved);
    });
  }, [colorMode]);

  const setThemeId = useCallback((id: PlatformThemeId) => {
    setThemeIdState(id);
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
  }, []);

  const value = useMemo(
    () => ({ themeId, setThemeId, themes: PLATFORM_THEMES, colorMode, setColorMode, resolvedColorMode }),
    [themeId, setThemeId, colorMode, setColorMode, resolvedColorMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
