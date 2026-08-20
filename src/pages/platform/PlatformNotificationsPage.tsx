import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { pushApi } from '@/lib/api';
import { PushNotificationsCard } from '@/components/settings/PushNotificationsCard';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { helperTextClass } from '@/components/common/Panel';

export function PlatformNotificationsPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('Viselle test notification');
  const [body, setBody] = useState('If you see this, push is working.');

  const { data: status, isLoading } = useQuery({
    queryKey: ['push', 'status'],
    queryFn: pushApi.getStatus,
  });

  const testSelf = useMutation({
    mutationFn: () => pushApi.sendTest(),
    onSuccess: (result) => {
      toast.success(`Sent ${result.sent} notification${result.sent === 1 ? '' : 's'} to this account`);
      void queryClient.invalidateQueries({ queryKey: ['push', 'status'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testAdmin = useMutation({
    mutationFn: () =>
      pushApi.adminSendTest({
        email: email.trim() || undefined,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      }),
    onSuccess: (result) => {
      toast.success(
        `Sent ${result.sent} of ${result.subscriptionCount} device(s) for ${result.targetEmail}`,
      );
      void queryClient.invalidateQueries({ queryKey: ['push', 'status'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Notification lab"
        description="Enable push on this device, then send a test. Use another user’s email to verify their subscriptions."
      />

      <PushNotificationsCard />

      {isLoading ? (
        <LoadingState />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Push status
            </CardTitle>
            <CardDescription>Server and device registration for your platform account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Web Push configured:{' '}
              <span className="font-medium">
                {status?.configured ? 'Yes' : 'No — set VAPID keys on the API'}
              </span>
            </p>
            <p>
              Your registered devices:{' '}
              <span className="font-medium">{status?.subscriptionCount ?? 0}</span>
            </p>
            {status?.subscriptions?.length ? (
              <ul className="space-y-1 text-stone-600 dark:text-stone-400">
                {status.subscriptions.map((sub) => (
                  <li key={sub.id} className="font-mono text-xs">
                    {sub.endpointHost}
                    {sub.userAgent ? ` · ${sub.userAgent.slice(0, 48)}…` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={helperTextClass}>Enable notifications above first.</p>
            )}
            <Button
              type="button"
              disabled={!status?.configured || testSelf.isPending}
              onClick={() => testSelf.mutate()}
            >
              <Send className="mr-2 h-4 w-4" />
              Send test to me
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send to a user</CardTitle>
          <CardDescription>
            Leave email blank to target yourself. The recipient must have enabled notifications on at
            least one device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="push-email">User email (optional)</Label>
            <Input
              id="push-email"
              type="email"
              placeholder="owner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="push-title">Title</Label>
            <Input id="push-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="push-body">Body</Label>
            <Input id="push-body" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <Button
            type="button"
            disabled={!status?.configured || testAdmin.isPending}
            onClick={() => testAdmin.mutate()}
          >
            Send test notification
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
