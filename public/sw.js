/* Viselle PWA — installability + Web Push. */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Viselle', body: 'You have a new notification', url: '/', tag: 'viselle' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) payload.body = text;
    } catch {
      // ignore
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Viselle', {
      body: payload.body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: payload.tag || 'viselle',
      data: { url: payload.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate?.(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
