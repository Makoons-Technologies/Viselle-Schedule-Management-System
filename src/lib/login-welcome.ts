import { toast } from 'sonner';
import { isStandaloneWebApp } from '@/lib/app-shell-viewport';

/** Session flag: standalone PWA login success, consumed once by the in-flow banner. */
export const LOGIN_WELCOME_STORAGE_KEY = 'viselle.login-welcome';
export const LOGIN_WELCOME_MESSAGE = 'Welcome back!';
export const LOGIN_WELCOME_DURATION_MS = 4000;

/**
 * BEA-85: installed iOS PWA must not use Sonner on the login-success path.
 * A `position:fixed` toaster (even with transform/animation neutralized, PR 50)
 * still promotes a layer while the app shell first paints; WebKit leaves
 * "Viselle Platform" as a 1× bitmap. In-flow banner instead.
 */
export function announceSignedInWelcome(): void {
  if (isStandaloneWebApp()) {
    markStandaloneLoginWelcome();
    return;
  }
  toast.success(LOGIN_WELCOME_MESSAGE);
}

export function markStandaloneLoginWelcome(): void {
  try {
    sessionStorage.setItem(LOGIN_WELCOME_STORAGE_KEY, '1');
  } catch {
    // Private mode / quota — skip the optional welcome; do not fall back to Sonner.
  }
}

/** Read without clearing — StrictMode remounts must still see the flag. */
export function hasStandaloneLoginWelcome(): boolean {
  try {
    return sessionStorage.getItem(LOGIN_WELCOME_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearStandaloneLoginWelcome(): void {
  try {
    sessionStorage.removeItem(LOGIN_WELCOME_STORAGE_KEY);
  } catch {
    // ignore
  }
}
