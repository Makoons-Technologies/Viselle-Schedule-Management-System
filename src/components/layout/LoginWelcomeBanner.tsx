import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  LOGIN_WELCOME_DURATION_MS,
  LOGIN_WELCOME_MESSAGE,
  clearStandaloneLoginWelcome,
  hasStandaloneLoginWelcome,
} from '@/lib/login-welcome';

/**
 * In-flow login success (not `position:fixed`). Instant mount/unmount —
 * no transform, filter, backdrop-filter, isolation, or CSS animation.
 * Lives in `<main>` so the topbar box never changes when it appears or leaves.
 */
export function LoginWelcomeBanner() {
  const [visible, setVisible] = useState(() => hasStandaloneLoginWelcome());

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => {
      clearStandaloneLoginWelcome();
      setVisible(false);
    }, LOGIN_WELCOME_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      data-testid="login-welcome-banner"
      role="status"
      className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
      {LOGIN_WELCOME_MESSAGE}
    </div>
  );
}
