import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { isStandaloneWebApp } from '@/lib/app-shell-viewport';

/** Sonner 2 defaults to 16px and does not add env(safe-area-inset-*). */
const TOAST_OFFSET = {
  top: 'calc(var(--safe-area-top) + 12px)',
  right: 'calc(var(--safe-area-right) + 12px)',
  bottom: 'calc(var(--safe-area-bottom) + 12px)',
  left: 'calc(var(--safe-area-left) + 12px)',
} as const;

/**
 * Installed PWA: keep remaining Sonner toasts off the title row (BEA-83
 * tab pad). Login-success does not use Sonner in standalone — see
 * announceSignedInWelcome (BEA-85 restage).
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

  const offset = standalone ? STANDALONE_TOAST_OFFSET : TOAST_OFFSET;

  return (
    <Toaster
      className="app-shell-toaster"
      position={standalone ? 'bottom-center' : 'top-right'}
      richColors
      theme={resolvedColorMode}
      offset={offset}
      mobileOffset={offset}
      swipeDirections={standalone ? [] : undefined}
      toastOptions={{ className: 'z-[80] app-shell-toast' }}
      style={{ zIndex: 80 }}
    />
  );
}
