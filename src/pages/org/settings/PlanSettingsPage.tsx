import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgMustChoosePlan } from '@/hooks/useOrgMustChoosePlan';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { orgApi } from '@/lib/api';
import { isOrgInActiveTrial } from '@/lib/trial';
import { LoadingState } from '@/components/common/LoadingState';
import { PlanComparisonSection } from '@/components/settings/PlanComparisonSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { centsToDollars } from '@/lib/utils';
import { getPlanTier, type PlanTierId } from '@/lib/plan-features';

export function PlanSettingsPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const { plan, isLoading } = useOrgPlan(orgId);
  const mustChoosePlan = useOrgMustChoosePlan();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutHandled = useRef(false);

  const { data: orgData } = useQuery({
    queryKey: ['organization', orgId, user?.role],
    queryFn: () => orgApi.getOrganization(orgId!),
    enabled: !!orgId && user?.role !== 'platform_owner',
  });
  const isOnActiveTrial = isOrgInActiveTrial(orgData?.organization);

  useEffect(() => {
    if (!orgId || checkoutHandled.current) return;

    const checkout = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');

    if (checkout === 'cancelled') {
      checkoutHandled.current = true;
      toast.message('Checkout cancelled — your plan was not changed.');
      setSearchParams({}, { replace: true });
      return;
    }

    if (checkout !== 'success' || !sessionId) return;

    checkoutHandled.current = true;
    let cancelled = false;

    async function confirmCheckout() {
      try {
        const result = await orgApi.getPlanCheckoutStatus(orgId!, sessionId!);
        if (cancelled) return;

        if (result.status === 'completed') {
          toast.success('Payment received — your plan is active.');
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['org-plan', orgId] }),
            queryClient.invalidateQueries({ queryKey: ['organization', orgId] }),
            queryClient.invalidateQueries({ queryKey: ['owner-settings', orgId] }),
          ]);
        } else if (result.status === 'failed') {
          toast.error('Checkout expired or failed. Please try again.');
        } else {
          toast.message('Confirming payment… refresh if your plan does not update shortly.');
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['org-plan', orgId] }),
            queryClient.invalidateQueries({ queryKey: ['organization', orgId] }),
          ]);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Could not confirm checkout.');
        }
      } finally {
        if (!cancelled) setSearchParams({}, { replace: true });
      }
    }

    void confirmCheckout();
    return () => {
      cancelled = true;
    };
  }, [orgId, queryClient, searchParams, setSearchParams]);

  if (isLoading) return <LoadingState />;
  if (!plan) return null;

  const knownTier: PlanTierId | null =
    plan.subscriptionTier === 'starter' ||
    plan.subscriptionTier === 'professional' ||
    plan.subscriptionTier === 'business'
      ? plan.subscriptionTier
      : null;
  const marketing = knownTier ? getPlanTier(knownTier) : null;
  /** Unpaid active trial: no paid plan chosen yet — don't present a phantom "current" tier. */
  const trialWithoutSubscription = isOnActiveTrial && !plan.hasStripeSubscription;

  return (
    <div className="space-y-6">
      {mustChoosePlan && !plan.hasStripeSubscription && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-semibold">Subscribe to unlock your salon</p>
          <p className="mt-1">
            Your trial is not active and billing is not linked yet. Choose a plan below to pay with
            Stripe Checkout — you can use Viselle again as soon as payment succeeds.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {trialWithoutSubscription ? 'Your trial' : 'Current plan'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-stone-600 dark:text-stone-300">
          {trialWithoutSubscription ? (
            <>
              <p>
                <span className="font-medium text-stone-900 dark:text-stone-100">
                  Full product access
                </span>
                {' · '}no paid plan selected yet
              </p>
              <p className="mt-1 text-stone-500 dark:text-stone-400">
                Every feature is unlocked for the trial period. Choose a plan below when you are
                ready to continue after the trial ends.
              </p>
            </>
          ) : (
            <>
              <p>
                <span className="font-medium text-stone-900 dark:text-stone-100">{plan.tierName}</span>
                {' · '}${centsToDollars(plan.monthlyPriceCents)}/mo
              </p>
              {marketing && (
                <p className="mt-1 text-stone-500 dark:text-stone-400">{marketing.tagline}</p>
              )}
              {!plan.hasStripeSubscription && (
                <p className="mt-2 text-amber-800 dark:text-amber-200">
                  Billing is not linked yet — subscribe below to activate paid access.
                </p>
              )}
            </>
          )}
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>
              Staff limit:{' '}
              {plan.maxStaffAccounts >= 999
                ? 'Unlimited'
                : plan.maxStaffAccounts === 0
                  ? 'Owner only'
                  : `Up to ${plan.maxStaffAccounts}`}
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

      <PlanComparisonSection
        orgId={orgId}
        currentTier={plan.subscriptionTier}
        hasStripeSubscription={plan.hasStripeSubscription}
        isOnActiveTrial={isOnActiveTrial}
      />
    </div>
  );
}
