import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { cn } from '@/lib/utils';
import { Panel, sectionMutedClass } from '@/components/common/Panel';
import { LoadingState } from '@/components/common/LoadingState';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PaymentsSettingsPage() {
  const orgId = useOrgId();
  const trialExpired = useOrgWriteLocked();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [readerCode, setReaderCode] = useState('');
  const autoSyncedRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ['stripe-connect', orgId],
    queryFn: () => orgApi.getStripeConnectStatus(orgId),
    enabled: !!orgId,
  });

  const syncMutation = useMutation({
    mutationFn: () => orgApi.syncStripeConnectStatus(orgId),
    onSuccess: (result) => {
      queryClient.setQueryData(['stripe-connect', orgId], (current: typeof data | undefined) => ({
        accountId: current?.accountId ?? null,
        chargesEnabled: result.chargesEnabled,
        onboardingComplete: result.onboardingComplete,
      }));
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
    if (!orgId || !data?.accountId || syncMutation.isPending) return;

    const fromStripe =
      searchParams.get('connected') === '1' || searchParams.get('refresh') === '1';
    const needsRefresh = data.onboardingComplete && !data.chargesEnabled;

    if ((fromStripe || needsRefresh) && !autoSyncedRef.current) {
      autoSyncedRef.current = true;
      syncMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, data?.accountId, data?.chargesEnabled, data?.onboardingComplete, searchParams]);

  if (isLoading) return <LoadingState />;

  const ready = data?.chargesEnabled && data?.onboardingComplete;
  const pendingActivation = Boolean(data?.accountId && data.onboardingComplete && !data.chargesEnabled);
  const needsOnboarding = Boolean(data?.accountId && !data.onboardingComplete);

  const statusLabel = ready
    ? 'Ready'
    : pendingActivation
      ? 'Activating'
      : needsOnboarding
        ? 'Onboarding incomplete'
        : 'Not connected';

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
          <Badge variant={ready ? 'success' : pendingActivation ? 'secondary' : 'secondary'}>
            {statusLabel}
          </Badge>
        </div>

        {pendingActivation && (
          <p className={cn('mb-4 text-sm', sectionMutedClass)}>
            Stripe onboarding is complete. We&apos;re syncing your account — this usually takes a few seconds.
          </p>
        )}

        {data?.accountId && (
          <p className="mb-4 text-xs text-stone-400 dark:text-stone-400">Account: {data.accountId}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {needsOnboarding && (
            <TrialLockedControl locked={trialExpired}>
              <Button onClick={() => onboardMutation.mutate()} disabled={trialExpired || onboardMutation.isPending}>
                {onboardMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Continue onboarding
              </Button>
            </TrialLockedControl>
          )}
          {!ready && !data?.accountId && (
            <TrialLockedControl locked={trialExpired}>
              <Button onClick={() => onboardMutation.mutate()} disabled={trialExpired || onboardMutation.isPending}>
                {onboardMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Connect with Stripe
              </Button>
            </TrialLockedControl>
          )}
          <TrialLockedControl locked={trialExpired}>
            <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={trialExpired || syncMutation.isPending}>
              <RefreshCw className="h-4 w-4" /> Refresh status
            </Button>
          </TrialLockedControl>
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
                disabled={trialExpired}
              />
            </div>
            <TrialLockedControl locked={trialExpired}>
              <Button
                onClick={() => registerReaderMutation.mutate()}
                disabled={trialExpired || !readerCode.trim() || registerReaderMutation.isPending}
              >
                Register reader
              </Button>
            </TrialLockedControl>
          </div>
        </Panel>
      )}
    </div>
  );
}
