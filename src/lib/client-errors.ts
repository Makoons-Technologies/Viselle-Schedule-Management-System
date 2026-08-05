type ClientErrorSource = 'boundary' | 'window' | 'unhandledrejection' | 'manual';

export type ClientErrorReport = {
  message: string;
  name?: string;
  stack?: string;
  componentStack?: string;
  source?: ClientErrorSource;
  url?: string;
};

const recentKeys = new Map<string, number>();
const DEDUPE_MS = 15_000;

function shouldSkip(key: string): boolean {
  const now = Date.now();
  for (const [k, ts] of recentKeys) {
    if (now - ts > DEDUPE_MS) recentKeys.delete(k);
  }
  if (recentKeys.has(key)) return true;
  recentKeys.set(key, now);
  return false;
}

/**
 * Fire-and-forget POST to the API so crashes show up in Vercel Runtime Logs.
 * Uses fetch (not axios) to avoid ApiError interceptor loops.
 */
export function reportClientError(report: ClientErrorReport): void {
  try {
    const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (!base) return;

    const message = (report.message || 'Unknown error').slice(0, 500);
    const dedupeKey = `${report.source ?? 'manual'}:${message}:${(report.stack ?? '').slice(0, 120)}`;
    if (shouldSkip(dedupeKey)) return;

    const body = JSON.stringify({
      message,
      name: report.name?.slice(0, 120),
      stack: report.stack?.slice(0, 4000),
      componentStack: report.componentStack?.slice(0, 4000),
      source: report.source ?? 'manual',
      url: (report.url ?? (typeof window !== 'undefined' ? window.location.href : undefined))?.slice(0, 1000),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 400) : undefined,
    });

    void fetch(`${base.replace(/\/$/, '')}/api/v1/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* swallow — reporting must never break the UI */
    });
  } catch {
    /* ignore */
  }
}

let listenersInstalled = false;

export function installClientErrorListeners(): void {
  if (listenersInstalled || typeof window === 'undefined') return;
  listenersInstalled = true;

  window.addEventListener('error', (event) => {
    const err = event.error;
    reportClientError({
      source: 'window',
      message: err instanceof Error ? err.message : event.message || 'window error',
      name: err instanceof Error ? err.name : undefined,
      stack: err instanceof Error ? err.stack : undefined,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportClientError({
      source: 'unhandledrejection',
      message: reason instanceof Error ? reason.message : String(reason ?? 'unhandled rejection'),
      name: reason instanceof Error ? reason.name : undefined,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
