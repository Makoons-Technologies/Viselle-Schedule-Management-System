import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyPlatformTheme,
  PLATFORM_THEMES,
  readStoredThemeId,
  THEME_STORAGE_KEY,
  type PlatformThemeId,
} from '@/lib/themes';

interface ThemeContextValue {
  themeId: PlatformThemeId;
  setThemeId: (id: PlatformThemeId) => void;
  themes: typeof PLATFORM_THEMES;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<PlatformThemeId>(() => readStoredThemeId());

  useEffect(() => {
    applyPlatformTheme(themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  }, [themeId]);

  const setThemeId = useCallback((id: PlatformThemeId) => {
    setThemeIdState(id);
  }, []);

  const value = useMemo(
    () => ({ themeId, setThemeId, themes: PLATFORM_THEMES }),
    [themeId, setThemeId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
