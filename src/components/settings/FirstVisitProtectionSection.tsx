import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import {
  DEFAULT_FIRST_VISIT_DEPOSIT_CENTS,
  depositDollarsInput,
  parseDepositDollars,
  readOwnerFirstVisitPayment,
} from '@/lib/first-visit-protection';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { TRIAL_LOCKED_MESSAGE } from '@/lib/trial';
import { cn } from '@/lib/utils';
import { helperTextClass, Panel, sectionMutedClass } from '@/components/common/Panel';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { BookingPaymentMode, FirstVisitPaymentMode, OwnerFirstVisitPayment } from '@/types/api';

interface FirstVisitProtectionSectionProps {
  orgId: string;
  stripeReady: boolean;
  firstVisitPayment?: OwnerFirstVisitPayment | null;
}

function modeButtonClass(selected: boolean) {
  return cn(
    'flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
    selected
      ? 'border-brand-600 bg-brand-50 text-stone-900 dark:border-brand-400 dark:bg-brand-950/40 dark:text-stone-100'
      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200',
  );
}

export function FirstVisitProtectionSection({
  orgId,
  stripeReady,
  firstVisitPayment,
}: FirstVisitProtectionSectionProps) {
  const trialExpired = useOrgWriteLocked();
  const queryClient = useQueryClient();
  const [depositInput, setDepositInput] = useState(depositDollarsInput(DEFAULT_FIRST_VISIT_DEPOSIT_CENTS));

  const { data: orgData } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => orgApi.getOrganization(orgId),
    enabled: !!orgId && !firstVisitPayment,
  });

  const payment = readOwnerFirstVisitPayment(firstVisitPayment ?? orgData?.firstVisitPayment);
  const enabled = payment.mode !== 'off';
  const activeMode: BookingPaymentMode = payment.mode === 'card_on_file' ? 'card_on_file' : 'deposit';

  useEffect(() => {
    setDepositInput(depositDollarsInput(payment.depositCents));
  }, [payment.depositCents]);

  const updateMutation = useMutation({
    mutationFn: (next: { mode: FirstVisitPaymentMode; depositCents: number | null }) =>
      orgApi.updateOrganization(orgId, {
        firstVisitPaymentMode: next.mode,
        firstVisitDepositCents: next.mode === 'deposit' ? next.depositCents : null,
      }),
    onSuccess: (result, next) => {
      queryClient.setQueryData(['organization', orgId], result);
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['stripe-connect', orgId] });
      if (!result.firstVisitPayment || result.firstVisitPayment.mode !== next.mode) {
        toast.error('Could not confirm first-visit payment was saved. Refresh and try again.');
        return;
      }
      toast.success('First-visit protection saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const save = (mode: FirstVisitPaymentMode, depositCents = payment.depositCents) => {
    if (mode !== 'off' && !stripeReady) {
      toast.error('Connect Stripe before requiring a deposit or card on file.');
      return;
    }
    const cents = depositCents ?? DEFAULT_FIRST_VISIT_DEPOSIT_CENTS;
    if (mode === 'deposit' && (cents < 100 || cents > 100_000)) {
      toast.error('Deposit must be between $1.00 and $1,000.00');
      return;
    }
    updateMutation.mutate({ mode, depositCents: mode === 'deposit' ? cents : null });
  };

  const commitDeposit = () => {
    const cents = parseDepositDollars(depositInput);
    if (cents == null) {
      toast.error('Enter a deposit between $1.00 and $1,000.00');
      setDepositInput(depositDollarsInput(payment.depositCents));
      return;
    }
    setDepositInput(depositDollarsInput(cents));
    if (!enabled || cents === (payment.depositCents ?? DEFAULT_FIRST_VISIT_DEPOSIT_CENTS)) {
      return;
    }
    save('deposit', cents);
  };

  return (
    <Panel className="p-6">
      <fieldset
        disabled={trialExpired || updateMutation.isPending}
        title={trialExpired ? TRIAL_LOCKED_MESSAGE : undefined}
        className="m-0 min-w-0 space-y-4 border-0 p-0"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">First-visit no-show protection</h3>
            <p className={cn('mt-1', sectionMutedClass)}>
              Require a deposit or card on file when a new client books online. Returning clients,
              gift cards, memberships, and in-person checkout are not part of this setting.
            </p>
          </div>
          <TrialLockedControl locked={trialExpired}>
            <Switch
              checked={enabled}
              disabled={trialExpired || updateMutation.isPending || (!stripeReady && !enabled)}
              onCheckedChange={(nextEnabled) =>
                save(nextEnabled ? activeMode : 'off', payment.depositCents)
              }
            />
          </TrialLockedControl>
        </div>

        {!stripeReady && (
          <p className={helperTextClass}>
            Connect Stripe above before turning this on. The public booking page will not collect a
            card until charges are enabled.
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className={modeButtonClass(activeMode === 'deposit')}
            onClick={() => {
              if (enabled && activeMode === 'deposit') return;
              save('deposit');
            }}
          >
            <p className="font-medium">Deposit</p>
            <p className={cn('mt-0.5 text-xs', sectionMutedClass)}>Charge a fixed amount at book. Applied to the visit if they show.</p>
          </button>
          <button
            type="button"
            className={modeButtonClass(activeMode === 'card_on_file')}
            onClick={() => {
              if (enabled && activeMode === 'card_on_file') return;
              save('card_on_file');
            }}
          >
            <p className="font-medium">Card on file</p>
            <p className={cn('mt-0.5 text-xs', sectionMutedClass)}>Save a card to hold the appointment. Charge only if they no-show.</p>
          </button>
        </div>

        {activeMode === 'deposit' && (
          <div className="max-w-xs">
            <Label htmlFor="first-visit-deposit">Deposit amount</Label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-500">$</span>
              <Input
                id="first-visit-deposit"
                inputMode="decimal"
                value={depositInput}
                onChange={(e) => setDepositInput(e.target.value)}
                onBlur={commitDeposit}
                className="pl-7"
                disabled={trialExpired}
              />
            </div>
            <p className={cn('mt-1', helperTextClass)}>$1.00–$1,000.00. Charged when a first-time client books.</p>
          </div>
        )}
      </fieldset>
    </Panel>
  );
}
