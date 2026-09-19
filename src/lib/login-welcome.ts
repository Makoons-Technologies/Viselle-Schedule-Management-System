import { toast } from 'sonner';
import { isStandaloneWebApp } from '@/lib/app-shell-viewport';

export const LOGIN_WELCOME_STORAGE_KEY = 'viselle.login-welcome';
export const LOGIN_WELCOME_MESSAGE = 'Welcome back!';

/**
 * Browser: toast immediately. Installed PWA: stash a flag because iOS
 * `goSignedInHome` does a full document reload that would drop an in-memory toast.
 */
export function announceSignedInWelcome(): void {
  if (isStandaloneWebApp()) {
    try {
      sessionStorage.setItem(LOGIN_WELCOME_STORAGE_KEY, '1');
      return;
    } catch {
      // Private mode / quota — still try a live toast.
    }
  }
  toast.success(LOGIN_WELCOME_MESSAGE);
}

/** Call once when the signed-in shell mounts. */
export function consumeStandaloneLoginWelcome(): void {
  try {
    if (sessionStorage.getItem(LOGIN_WELCOME_STORAGE_KEY) !== '1') return;
    sessionStorage.removeItem(LOGIN_WELCOME_STORAGE_KEY);
  } catch {
    return;
  }
  toast.success(LOGIN_WELCOME_MESSAGE);
}
