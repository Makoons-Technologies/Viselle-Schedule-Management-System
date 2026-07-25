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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SubscriptionTier } from '@/types/api';

interface PlanComparisonSectionProps {
  orgId: string;
  currentTier: SubscriptionTier | null | undefined;
}

function ctaLabel(
  current: PlanTierId | null,
  target: PlanTierId,
): 'Current plan' | 'Upgrade' | 'Downgrade' | 'Switch plan' {
  if (current === target) return 'Current plan';
  const change = compareTierChange(current, target);
  if (change === 'upgrade') return 'Upgrade';
  if (change === 'downgrade') return 'Downgrade';
  return 'Switch plan';
}

export function PlanComparisonSection({ orgId, currentTier }: PlanComparisonSectionProps) {
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
      if (result.billingMode === 'settings_only_stripe_failed') {
        toast.warning(result.message);
      } else if (result.billingMode === 'settings_only') {
        toast.success(result.message, { duration: 8000 });
      } else {
        toast.success(result.message);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function confirmAndChange(tier: PlanTierId) {
    const label = ctaLabel(normalizedCurrent, tier);
    if (label === 'Current plan') return;
    const tierMeta = PLAN_TIERS.find((t) => t.id === tier)!;
    const ok = window.confirm(
      `${label} to ${tierMeta.name} ($${priceMonthlyDollars(tierMeta)}/mo)?\n\n` +
        'Features unlock or lock immediately. If Stripe billing is linked, the subscription price updates with proration; otherwise only plan features change and you may need to contact us about invoicing.',
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
            Checkmarks show what each tier includes. Upgrade or downgrade anytime — feature access
            updates immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentTier === 'custom' && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              This organization is on a custom plan. Choosing a tier below replaces custom feature
              flags with that tier&apos;s presets.
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
                    const label = ctaLabel(normalizedCurrent, tier.id);
                    const isCurrent = label === 'Current plan';
                    return (
                      <td key={tier.id} className="px-2 pt-4 text-center">
                        <Button
                          size="sm"
                          variant={isCurrent ? 'secondary' : tier.highlighted ? 'default' : 'outline'}
                          disabled={isCurrent || changeMutation.isPending}
                          className={cn('w-full min-w-[7.5rem]', isCurrent && 'cursor-default')}
                          onClick={() => confirmAndChange(tier.id)}
                        >
                          {changeMutation.isPending && changeMutation.variables === tier.id
                            ? 'Updating…'
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
            <Link to={contactPath({ interest: 'upgrade' })} className="text-brand-700 hover:underline">
              Contact us
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
