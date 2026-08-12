import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PushNotificationsCard() {
  const { supported, permission, subscribed, busy, error, enable, disable } = usePushNotifications();

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Device notifications
          </CardTitle>
          <CardDescription>
            Push notifications need a phone or tablet browser that supports them (Chrome/Safari with the
            app added to your home screen on iOS).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Device notifications
        </CardTitle>
        <CardDescription>
          Get appointment and low-stock alerts on this device. On iPhone/iPad, add Viselle to your Home
          Screen first, then enable notifications here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Status:{' '}
          {subscribed
            ? 'Enabled on this device'
            : permission === 'denied'
              ? 'Blocked in browser settings'
              : 'Not enabled'}
        </p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {subscribed ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void disable().then((ok) => {
                if (ok) toast.success('Notifications disabled on this device');
              })
            }
          >
            Disable on this device
          </Button>
        ) : (
          <Button
            type="button"
            disabled={busy || permission === 'denied'}
            onClick={() =>
              void enable().then((ok) => {
                if (ok) toast.success('Notifications enabled');
              })
            }
          >
            Enable notifications
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
