import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { isStandaloneWebApp } from '@/lib/app-shell-viewport';

const TOAST_OFFSET = 16;

/**
 * Installed PWA: keep remaining Sonner toasts off the tab bar.
 * No env(safe-area-inset-*) — iOS frost work must not come back as toast pad.
 */
const STANDALONE_TOAST_OFFSET = {
  top: '12px',
  right: '12px',
  bottom: 'calc(3.25rem + var(--app-shell-bottomnav-pad, 34px) + 12px)',
  left: '12px',
} as const;

function readStandalonePwa(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('standalone-pwa') || isStandaloneWebApp();
}

export function AppToaster() {
  const { resolvedColorMode } = useTheme();
  const [standalone, setStandalone] = useState(readStandalonePwa);

  useEffect(() => {
    const sync = () => setStandalone(readStandalonePwa());
    sync();
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return (
    <Toaster
      className="app-shell-toaster"
      position={standalone ? 'bottom-center' : 'top-right'}
      richColors
      theme={resolvedColorMode}
      offset={standalone ? STANDALONE_TOAST_OFFSET : TOAST_OFFSET}
      mobileOffset={standalone ? STANDALONE_TOAST_OFFSET : TOAST_OFFSET}
      swipeDirections={standalone ? [] : undefined}
      toastOptions={{ className: 'z-[80] app-shell-toast' }}
      style={{ zIndex: 80 }}
    />
  );
}
