/**
 * Capture `beforeinstallprompt` as soon as the bundle loads.
 * Chromium often fires it before React effects attach (SW already active).
 */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Listener = () => void;

let deferred: BeforeInstallPromptEvent | null = null;
let capturing = false;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

function onBeforeInstallPrompt(event: Event): void {
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
  notify();
}

function onAppInstalled(): void {
  deferred = null;
  notify();
}

export function captureInstallPromptEvents(): void {
  if (typeof window === 'undefined' || capturing) return;
  capturing = true;
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function subscribeInstallPrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function promptDeferredInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferred;
  if (!event) return 'unavailable';
  deferred = null;
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}
