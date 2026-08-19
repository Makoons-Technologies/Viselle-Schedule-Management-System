export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js?v=20260819').catch((err) => {
      console.warn('[pwa] service worker registration failed', err);
    });
  });
}
