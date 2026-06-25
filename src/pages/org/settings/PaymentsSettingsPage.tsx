import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { useOrgId } from '@/hooks/useOrgId';
import { cn } from '@/lib/utils';
import { Panel, sectionMutedClass } from '@/components/common/Panel';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PaymentsSettingsPage() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [readerCode, setReaderCode] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['stripe-connect', orgId],
    queryFn: () => orgApi.getStripeConnectStatus(orgId),
    enabled: !!orgId,
  });

  const syncMutation = useMutation({
    mutationFn: () => orgApi.syncStripeConnectStatus(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripe-connect', orgId] });
      toast.success('Stripe status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onboardMutation = useMutation({
    mutationFn: () => orgApi.startStripeConnectOnboarding(orgId),
    onSuccess: (result) => {
      window.location.href = result.url;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const registerReaderMutation = useMutation({
    mutationFn: () => orgApi.registerTerminalReader(orgId, { registrationCode: readerCode }),
    onSuccess: () => {
      toast.success('Reader registered');
      setReaderCode('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (searchParams.get('connected') === '1' || searchParams.get('refresh') === '1') {
      syncMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (isLoading) return <LoadingState />;

  const ready = data?.chargesEnabled && data?.onboardingComplete;

  return (
    <div className="max-w-xl space-y-8">
      <Panel className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Stripe Connect</h3>
            <p className={cn('mt-1', sectionMutedClass)}>
              Connect your salon&apos;s Stripe account to accept in-person card payments. Funds go directly to your bank.
            </p>
          </div>
          <Badge variant={ready ? 'success' : 'secondary'}>{ready ? 'Ready' : 'Not connected'}</Badge>
        </div>

        {data?.accountId && (
          <p className="mb-4 text-xs text-stone-400 dark:text-stone-400">Account: {data.accountId}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {!ready && (
            <Button onClick={() => onboardMutation.mutate()} disabled={onboardMutation.isPending}>
              {onboardMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {data?.accountId ? 'Continue onboarding' : 'Connect with Stripe'}
            </Button>
          )}
          <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            <RefreshCw className="h-4 w-4" /> Refresh status
          </Button>
        </div>
      </Panel>

      {ready && (
        <Panel className="p-6">
          <h3 className="mb-1 font-semibold">Card reader</h3>
          <p className={cn('mb-4', sectionMutedClass)}>
            Register a Stripe Terminal reader using the registration code from the reader or Stripe Dashboard.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Registration code</Label>
              <Input
                value={readerCode}
                onChange={(e) => setReaderCode(e.target.value)}
                placeholder="e.g. peachy-bliss"
              />
            </div>
            <Button
              onClick={() => registerReaderMutation.mutate()}
              disabled={!readerCode.trim() || registerReaderMutation.isPending}
            >
              Register reader
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
