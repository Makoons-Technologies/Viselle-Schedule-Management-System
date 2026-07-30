import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import {
  PLAN_FEATURES,
  PLAN_TIERS,
  compareTierChange,
  priceMonthlyDollars,
  tierIncludesFeature,
  type PlanTierId,
} from '@/lib/plan-features';
import { contactPath } from '@/lib/contact';
import { cn } from '@/lib/utils';
import { redirectToStripeUrl } from '@/lib/safe-redirect';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SubscriptionTier } from '@/types/api';

interface PlanComparisonSectionProps {
  orgId: string;
  currentTier: SubscriptionTier | null | undefined;
  hasStripeSubscription: boolean;
  /** Active (non-expired) trial — lower tiers cannot be selected. */
  isOnActiveTrial?: boolean;
}

type PlanCtaLabel =
  | 'Current plan'
  | 'Upgrade'
  | 'Downgrade'
  | 'Switch plan'
  | 'Subscribe'
  | 'Unavailable';

function ctaLabel(
  current: PlanTierId | null,
  target: PlanTierId,
  hasStripeSubscription: boolean,
  isOnActiveTrial: boolean,
): PlanCtaLabel {
  if (current === target) {
    return hasStripeSubscription ? 'Current plan' : 'Subscribe';
  }
  const change = compareTierChange(current, target);
  if (change === 'downgrade' && isOnActiveTrial) return 'Unavailable';
  if (change === 'upgrade') return 'Upgrade';
  if (change === 'downgrade') return 'Downgrade';
  return 'Switch plan';
}

export function PlanComparisonSection({
  orgId,
  currentTier,
  hasStripeSubscription,
  isOnActiveTrial = false,
}: PlanComparisonSectionProps) {
  const queryClient = useQueryClient();
  const normalizedCurrent: PlanTierId | null =
    currentTier === 'starter' || currentTier === 'professional' || currentTier === 'business'
      ? currentTier
      : null;

  const changeMutation = useMutation({
    mutationFn: (tier: PlanTierId) => orgApi.changePlan(orgId, tier),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['org-plan', orgId] });
      queryClient.invalidateQueries({ queryKey: ['owner-settings', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      if (result.billingMode === 'settings_only_stripe_failed') {
        toast.warning(result.message);
      } else {
        toast.success(result.message);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkoutMutation = useMutation({
    mutationFn: (tier: PlanTierId) => orgApi.createPlanCheckout(orgId, tier),
    onSuccess: (result) => {
      if (!result.checkoutUrl) {
        toast.error('Checkout could not be started. Please try again or contact support.');
        return;
      }
      if (!redirectToStripeUrl(result.checkoutUrl)) {
        toast.error('Received an unexpected checkout URL');
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pending =
    changeMutation.isPending || checkoutMutation.isPending;
  const pendingTier = changeMutation.isPending
    ? changeMutation.variables
    : checkoutMutation.isPending
      ? checkoutMutation.variables
      : undefined;

  function confirmAndChange(tier: PlanTierId) {
    const label = ctaLabel(normalizedCurrent, tier, hasStripeSubscription, isOnActiveTrial);
    if (label === 'Current plan' || label === 'Unavailable') return;
    const tierMeta = PLAN_TIERS.find((t) => t.id === tier)!;

    if (!hasStripeSubscription) {
      const ok = window.confirm(
        `${label} to ${tierMeta.name} ($${priceMonthlyDollars(tierMeta)}/mo)?\n\n` +
          'You will be taken to Stripe Checkout to enter your card and activate billing. Features unlock after payment succeeds.',
      );
      if (!ok) return;
      checkoutMutation.mutate(tier);
      return;
    }

    const ok = window.confirm(
      `${label} to ${tierMeta.name} ($${priceMonthlyDollars(tierMeta)}/mo)?\n\n` +
        'Features unlock or lock immediately. Your Stripe subscription price updates with proration.',
    );
    if (!ok) return;
    changeMutation.mutate(tier);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compare plans</CardTitle>
          <CardDescription>
            {isOnActiveTrial
              ? 'Checkmarks show what each tier includes. During your trial you can subscribe to your current plan or upgrade — downgrades are unavailable until the trial ends.'
              : hasStripeSubscription
                ? 'Checkmarks show what each tier includes. Upgrade or downgrade anytime — feature access updates immediately.'
                : 'Checkmarks show what each tier includes. Choose a plan to pay with Stripe Checkout and activate your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentTier === 'custom' && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              This organization is on a custom plan. Choosing a tier below replaces custom feature
              flags with that tier&apos;s presets.
            </p>
          )}

          {!hasStripeSubscription && (
            <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
              No card is linked yet. Selecting a plan opens Stripe Checkout so you can subscribe and
              unlock the app.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-700">
                  <th className="py-3 pr-4 text-left font-medium text-stone-500">Feature</th>
                  {PLAN_TIERS.map((tier) => (
                    <th key={tier.id} className="px-2 py-3 text-center font-semibold text-stone-900 dark:text-stone-100">
                      <div>{tier.name}</div>
                      <div className="text-xs font-normal text-stone-500">
                        ${priceMonthlyDollars(tier)}/mo
                      </div>
                      <div className="text-xs font-normal text-brand-700 dark:text-brand-300">
                        {tier.staffLimitLabel}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLAN_FEATURES.map((feature) => (
                  <tr key={feature.id} className="border-b border-stone-100 dark:border-stone-800">
                    <td className="py-3 pr-4 align-top">
                      <div className="font-medium text-stone-900 dark:text-stone-100">{feature.name}</div>
                      <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                        {feature.description}
                      </div>
                    </td>
                    {PLAN_TIERS.map((tier) => {
                      const included = tierIncludesFeature(tier.id, feature.id);
                      return (
                        <td key={tier.id} className="px-2 py-3 text-center align-middle">
                          {included ? (
                            <Check
                              className="mx-auto h-5 w-5 text-brand-600 dark:text-brand-400"
                              aria-label="Included"
                            />
                          ) : (
                            <X
                              className="mx-auto h-5 w-5 text-stone-300 dark:text-stone-600"
                              aria-label="Not included"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-4" />
                  {PLAN_TIERS.map((tier) => {
                    const label = ctaLabel(
                      normalizedCurrent,
                      tier.id,
                      hasStripeSubscription,
                      isOnActiveTrial,
                    );
                    const isCurrent = label === 'Current plan';
                    const isUnavailable = label === 'Unavailable';
                    const isDisabled = isCurrent || isUnavailable || pending;
                    return (
                      <td key={tier.id} className="px-2 pt-4 text-center">
                        <Button
                          size="sm"
                          variant={
                            isCurrent || isUnavailable
                              ? 'secondary'
                              : tier.highlighted
                                ? 'default'
                                : 'outline'
                          }
                          disabled={isDisabled}
                          title={
                            isUnavailable
                              ? 'Downgrades are not available while your trial is active'
                              : undefined
                          }
                          className={cn(
                            'w-full min-w-[7.5rem]',
                            (isCurrent || isUnavailable) && 'cursor-default',
                            isUnavailable && 'opacity-60',
                          )}
                          onClick={() => confirmAndChange(tier.id)}
                        >
                          {pending && pendingTier === tier.id
                            ? hasStripeSubscription
                              ? 'Updating…'
                              : 'Redirecting…'
                            : label}
                        </Button>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-stone-500 dark:text-stone-400">
            Need a custom arrangement?{' '}
            <Link to={contactPath({ interest: 'general' })} className="text-brand-700 hover:underline">
              Contact us
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
