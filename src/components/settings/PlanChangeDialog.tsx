import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import {
  PLAN_TIERS,
  featuresLostOnChange,
  priceMonthlyDollars,
  type PlanTierId,
} from '@/lib/plan-features';
import type { Account } from '@/types/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/LoadingState';

export type PlanChangeCtaLabel = 'Upgrade' | 'Downgrade' | 'Switch plan' | 'Subscribe';

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  currentTier: PlanTierId | null;
  targetTier: PlanTierId;
  ctaLabel: PlanChangeCtaLabel;
  hasStripeSubscription: boolean;
  onConfirmStripeChange: (tier: PlanTierId) => void;
  onConfirmCheckout: (tier: PlanTierId) => void;
  confirming: boolean;
}

function staffDisplayName(account: Account): string {
  const name = `${account.firstName} ${account.lastName}`.trim();
  return name || account.email;
}

export function PlanChangeDialog({
  open,
  onOpenChange,
  orgId,
  currentTier,
  targetTier,
  ctaLabel,
  hasStripeSubscription,
  onConfirmStripeChange,
  onConfirmCheckout,
  confirming,
}: PlanChangeDialogProps) {
  const queryClient = useQueryClient();
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);

  const tierMeta = PLAN_TIERS.find((t) => t.id === targetTier)!;
  const maxStaff = tierMeta.maxStaffAccounts;
  const lostFeatures = useMemo(
    () => featuresLostOnChange(currentTier, targetTier),
    [currentTier, targetTier],
  );

  const accountsQuery = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: open && !!orgId,
  });

  const accounts = accountsQuery.data?.accounts ?? [];
  const activeStaff = accounts.filter((a) => a.role !== 'org_owner' && a.status === 'active');
  const excess = Math.max(0, activeStaff.length - maxStaff);
  const staffOk = activeStaff.length <= maxStaff;

  const deactivateMutation = useMutation({
    mutationFn: (accountId: string) =>
      orgApi.updateAccount(orgId, accountId, { status: 'inactive' }),
    onMutate: (accountId) => setBusyAccountId(accountId),
    onSuccess: () => {
      toast.success('Staff deactivated');
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setBusyAccountId(null),
  });

  const removeMutation = useMutation({
    mutationFn: (accountId: string) => orgApi.deleteAccount(orgId, accountId),
    onMutate: (accountId) => setBusyAccountId(accountId),
    onSuccess: () => {
      toast.success('Staff removed');
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setBusyAccountId(null),
  });

  const staffBusy = deactivateMutation.isPending || removeMutation.isPending;
  const confirmDisabled = confirming || staffBusy || !staffOk || accountsQuery.isLoading;

  function handleConfirm() {
    if (!staffOk) return;
    if (hasStripeSubscription) {
      onConfirmStripeChange(targetTier);
    } else {
      onConfirmCheckout(targetTier);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {ctaLabel} to {tierMeta.name}
          </DialogTitle>
          <DialogDescription>
            ${priceMonthlyDollars(tierMeta)}/mo · {tierMeta.staffLimitLabel}.
            {hasStripeSubscription
              ? ' Features update immediately; Stripe proration may apply.'
              : ' You’ll continue to Stripe Checkout to enter a card and activate billing.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {lostFeatures.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-medium">You’ll lose access to:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {lostFeatures.map((f) => (
                  <li key={f.id}>{f.name}</li>
                ))}
              </ul>
              {lostFeatures.some((f) => f.id === 'recurring_appointments') && (
                <p className="mt-2 text-xs">
                  Existing recurring series stay on the calendar but won’t create new visits until
                  you upgrade again. You can still cancel or delete series.
                </p>
              )}
              {lostFeatures.some((f) => f.id === 'sms_reminders') && (
                <p className="mt-2 text-xs">Pending text reminders for this plan will stop sending.</p>
              )}
            </div>
          )}

          <div className="rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Staff seats</p>
              <Badge variant={staffOk ? 'secondary' : 'destructive'}>
                {activeStaff.length}
                {maxStaff >= 999 ? ' / unlimited' : ` / ${maxStaff}`} active
              </Badge>
            </div>
            {!staffOk ? (
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                {maxStaff === 0
                  ? `Deactivate or remove ${excess} staff member${excess === 1 ? '' : 's'} to continue — Starter is owner-only.`
                  : `Deactivate or remove ${excess} staff member${excess === 1 ? '' : 's'} to fit this plan.`}
              </p>
            ) : (
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {maxStaff === 0
                  ? 'No additional staff on this plan — you’re set.'
                  : 'Staff count fits this plan.'}
              </p>
            )}

            {accountsQuery.isLoading ? (
              <div className="py-4">
                <LoadingState />
              </div>
            ) : activeStaff.length > 0 ? (
              <ul className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
                {activeStaff.map((account) => {
                  const busy = busyAccountId === account.id;
                  return (
                    <li
                      key={account.id}
                      className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                          {staffDisplayName(account)}
                        </p>
                        <p className="truncate text-xs text-stone-500">{account.email}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy || confirming}
                          onClick={() => deactivateMutation.mutate(account.id)}
                        >
                          {busy && deactivateMutation.isPending ? '…' : 'Deactivate'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={busy || confirming}
                          onClick={() => removeMutation.mutate(account.id)}
                        >
                          {busy && removeMutation.isPending ? '…' : 'Remove'}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={confirmDisabled}>
            {confirming
              ? hasStripeSubscription
                ? 'Updating…'
                : 'Redirecting…'
              : !staffOk
                ? `Reduce staff by ${excess}`
                : hasStripeSubscription
                  ? `Confirm ${ctaLabel.toLowerCase()}`
                  : 'Continue to checkout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
