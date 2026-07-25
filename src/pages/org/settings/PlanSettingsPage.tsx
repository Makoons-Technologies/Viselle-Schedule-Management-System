import { useOrgId } from '@/hooks/useOrgId';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { LoadingState } from '@/components/common/LoadingState';
import { PlanComparisonSection } from '@/components/settings/PlanComparisonSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { centsToDollars } from '@/lib/utils';
import { getPlanTier, type PlanTierId } from '@/lib/plan-features';

export function PlanSettingsPage() {
  const orgId = useOrgId();
  const { plan, isLoading } = useOrgPlan(orgId);

  if (isLoading) return <LoadingState />;
  if (!plan) return null;

  const knownTier: PlanTierId | null =
    plan.subscriptionTier === 'starter' ||
    plan.subscriptionTier === 'professional' ||
    plan.subscriptionTier === 'business'
      ? plan.subscriptionTier
      : null;
  const marketing = knownTier ? getPlanTier(knownTier) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current plan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-stone-600 dark:text-stone-300">
          <p>
            <span className="font-medium text-stone-900 dark:text-stone-100">{plan.tierName}</span>
            {' · '}${centsToDollars(plan.monthlyPriceCents)}/month
          </p>
          {marketing && (
            <p className="mt-1 text-stone-500 dark:text-stone-400">{marketing.tagline}</p>
          )}
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>
              Staff limit:{' '}
              {plan.maxStaffAccounts >= 999 ? 'Unlimited' : `Up to ${plan.maxStaffAccounts}`}
            </li>
            <li>Email reminders: {plan.emailRemindersEnabled ? 'Included' : 'Not included'}</li>
            <li>Text (SMS) reminders: {plan.smsRemindersEnabled ? 'Included' : 'Not included'}</li>
            <li>
              Recurring appointments:{' '}
              {plan.recurringAppointmentsEnabled ? 'Included' : 'Not included'}
            </li>
          </ul>
        </CardContent>
      </Card>

      <PlanComparisonSection orgId={orgId} currentTier={plan.subscriptionTier} />
    </div>
  );
}
