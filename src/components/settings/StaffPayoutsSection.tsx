import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { isRequestAborted, orgApi } from '@/lib/api';
import { BlockingProgressDialog, useBlockingProgress } from '@/components/common/BlockingProgressDialog';
import { redirectToStripeUrl } from '@/lib/safe-redirect';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { cn } from '@/lib/utils';
import { helperTextClass, Panel, sectionMutedClass } from '@/components/common/Panel';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { StaffPayoutMode, StaffPayoutSchedule, StaffPayoutSettings } from '@/types/api';

function modeButtonClass(selected: boolean) {
  return cn(
    'flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
    selected
      ? 'border-brand-600 bg-brand-50 text-stone-900 dark:border-brand-400 dark:bg-brand-950/40 dark:text-stone-100'
      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200',
  );
}

interface StaffPayoutsSectionProps {
  orgId: string;
  salonStripeReady: boolean;
}

export function StaffPayoutsSection({ orgId, salonStripeReady }: StaffPayoutsSectionProps) {
  const trialExpired = useOrgWriteLocked();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const syncedRef = useRef(false);
  const onboardProgress = useBlockingProgress();

  const { data } = useQuery({
    queryKey: ['staff-payouts', orgId],
    queryFn: () => orgApi.getStaffPayoutSettings(orgId),
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: (next: Partial<Pick<StaffPayoutSettings, 'mode' | 'schedule' | 'includeCommission' | 'includeTips'>>) =>
      orgApi.updateStaffPayoutSettings(orgId, next),
    onSuccess: (result) => {
      queryClient.setQueryData(['staff-payouts', orgId], result);
      toast.success('Staff payout settings saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onboardMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const controller = new AbortController();
      onboardProgress.start({
        title: 'Staff bank',
        message: 'Starting bank setup…',
        onCancel: () => controller.abort(),
      });
      try {
        const result = await orgApi.startStaffPayoutOnboarding(orgId, accountId, controller.signal);
        onboardProgress.update({ message: 'Opening Stripe…', onCancel: undefined });
        return result;
      } catch (err) {
        onboardProgress.stop();
        throw err;
      }
    },
    onSuccess: (result) => {
      if (!redirectToStripeUrl(result.url)) {
        onboardProgress.stop();
        toast.error('Received an unexpected onboarding URL');
      }
    },
    onError: (err: Error) => {
      if (isRequestAborted(err)) return;
      toast.error(err.message);
    },
  });

  const syncMutation = useMutation({
    mutationFn: (accountId: string) => orgApi.syncStaffPayoutRecipient(orgId, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-payouts', orgId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      toast.success('Bank status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!data || syncedRef.current) return;
    if (searchParams.get('staff_payout') !== '1' && searchParams.get('staff_payout') !== 'refresh') return;
    syncedRef.current = true;
    const pending = data.recipients.filter((row) => row.onboardingComplete === false || !row.payoutsReady);
    const targets = pending.length > 0 ? pending : data.recipients;
    for (const row of targets) {
      if (row.accountId) void orgApi.syncStaffPayoutRecipient(orgId, row.accountId);
    }
    void queryClient.invalidateQueries({ queryKey: ['staff-payouts', orgId] });
  }, [data, orgId, queryClient, searchParams]);

  const mode: StaffPayoutMode = data?.mode ?? 'track_only';
  const optedIn = mode === 'salon_stripe';

  const setMode = (next: StaffPayoutMode) => {
    if (next === 'salon_stripe' && !salonStripeReady) {
      toast.error('Connect the salon Stripe account before paying staff from salon Stripe.');
      return;
    }
    updateMutation.mutate({ mode: next });
  };

  return (
    <Panel className="p-6">
      <h3 className="font-semibold">Staff payouts</h3>
      <p className={cn('mt-1', sectionMutedClass)}>
        {optedIn
          ? 'Transfers send the worksheet amount from the salon Stripe balance. This is not W-2 or 1099 payroll.'
          : 'I pay staff myself. Viselle tracks commissions and tips; this is not W-2 or 1099 payroll.'}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={modeButtonClass(!optedIn)}
          disabled={trialExpired || updateMutation.isPending}
          onClick={() => setMode('track_only')}
        >
          <span className="font-medium">I pay staff myself</span>
          <span className={cn('mt-1 block text-xs', helperTextClass)}>Default. No staff bank setup.</span>
        </button>
        <button
          type="button"
          className={modeButtonClass(optedIn)}
          disabled={trialExpired || updateMutation.isPending}
          onClick={() => setMode('salon_stripe')}
        >
          <span className="font-medium">Pay from salon Stripe</span>
          <span className={cn('mt-1 block text-xs', helperTextClass)}>
            After the period, send the worksheet amount to staff who added a bank.
          </span>
        </button>
      </div>

      {optedIn && salonStripeReady ? (
        <div className="mt-6 space-y-5">
          <p className={cn('text-sm', sectionMutedClass)}>
            Viselle transfers the worksheet amount from the salon Stripe balance. This is not payroll and does not
            file W-2 or 1099 forms.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="staff-payout-schedule">Schedule</Label>
            <Select
              value={data?.schedule ?? 'weekly'}
              onValueChange={(value) =>
                updateMutation.mutate({ schedule: value as StaffPayoutSchedule })
              }
              disabled={trialExpired}
            >
              <SelectTrigger id="staff-payout-schedule" className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual only</SelectItem>
                <SelectItem value="weekly">Weekly (previous Mon–Sun, UTC)</SelectItem>
                <SelectItem value="biweekly">Biweekly (previous two ISO weeks)</SelectItem>
                <SelectItem value="monthly">Monthly (previous calendar month)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Include commissions</p>
                <p className={cn('text-xs', helperTextClass)}>Each person&apos;s percent of service sales.</p>
              </div>
              <Switch
                checked={data?.includeCommission ?? true}
                onCheckedChange={(checked) => updateMutation.mutate({ includeCommission: checked })}
                disabled={trialExpired}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Include tips</p>
                <p className={cn('text-xs', helperTextClass)}>100% of tips from tagged sales.</p>
              </div>
              <Switch
                checked={data?.includeTips ?? true}
                onCheckedChange={(checked) => updateMutation.mutate({ includeTips: checked })}
                disabled={trialExpired}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Staff banks</p>
            <ul className="space-y-2">
              {(data?.recipients ?? []).map((row) => (
                <li
                  key={row.accountId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700"
                >
                  <div>
                    <p className="text-sm font-medium">{row.name}</p>
                    <p className={cn('text-xs', helperTextClass)}>{row.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={row.payoutsReady ? 'success' : 'secondary'}>
                      {row.payoutsReady ? 'Ready' : row.onboardingComplete ? 'Reviewing' : 'Needs bank'}
                    </Badge>
                    <TrialLockedControl locked={trialExpired}>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={trialExpired || onboardMutation.isPending || syncMutation.isPending}
                        onClick={() =>
                          row.payoutsReady
                            ? syncMutation.mutate(row.accountId)
                            : onboardMutation.mutate(row.accountId)
                        }
                      >
                        {row.payoutsReady ? 'Refresh' : 'Add bank'}
                      </Button>
                    </TrialLockedControl>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <BlockingProgressDialog {...onboardProgress.dialogProps} />
    </Panel>
  );
}
