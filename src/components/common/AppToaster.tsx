import { Toaster } from 'sonner';
import { useTheme } from '@/context/ThemeContext';

/** Sonner 2 defaults to 16px and does not add env(safe-area-inset-*). */
const TOAST_OFFSET = {
  top: 'calc(var(--safe-area-top) + 12px)',
  right: 'calc(var(--safe-area-right) + 12px)',
  bottom: 'calc(var(--safe-area-bottom) + 12px)',
  left: 'calc(var(--safe-area-left) + 12px)',
} as const;

export function AppToaster() {
  const { resolvedColorMode } = useTheme();

  return (
    <Toaster
      position="top-right"
      richColors
      theme={resolvedColorMode}
      offset={TOAST_OFFSET}
      mobileOffset={TOAST_OFFSET}
      toastOptions={{ className: 'z-[80]' }}
      style={{ zIndex: 80 }}
    />
  );
}
