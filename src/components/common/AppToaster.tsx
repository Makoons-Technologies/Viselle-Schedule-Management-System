import { Toaster } from 'sonner';
import { useTheme } from '@/context/ThemeContext';

/**
 * Pin toasts at the top, just below the 56px mobile title row so they
 * cannot cover the sandwich button. Do not move these into `<main>`.
 */
const TOAST_OFFSET = { top: 64, right: 16, bottom: 16, left: 16 } as const;

export function AppToaster() {
  const { resolvedColorMode } = useTheme();

  return (
    <Toaster
      className="app-shell-toaster"
      position="top-right"
      richColors
      theme={resolvedColorMode}
      offset={TOAST_OFFSET}
      toastOptions={{ className: 'z-[80] app-shell-toast' }}
      style={{ zIndex: 80 }}
    />
  );
}
