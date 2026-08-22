import { useCallback, useEffect, useState } from 'react';
import { ApiError, pushApi } from '@/lib/api';

function pushFailureMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && (err.status === 404 || err.code === 'NOT_FOUND')) {
    return 'Push is not available on this server yet. The staging API still needs the /push routes restored.';
  }
  return err instanceof Error ? err.message : fallback;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);

    if (!ok) return;
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => setSubscribed(false));
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Notification permission was not granted');
        return false;
      }
      const { publicKey } = await pushApi.getVapidPublicKey();
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Invalid push subscription from browser');
      }
      await pushApi.subscribe({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent,
      });
      setSubscribed(true);
      return true;
    } catch (err) {
      setError(pushFailureMessage(err, 'Failed to enable notifications'));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await pushApi.unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      return true;
    } catch (err) {
      setError(pushFailureMessage(err, 'Failed to disable notifications'));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { supported, permission, subscribed, busy, error, enable, disable };
}
