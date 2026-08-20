import { Link } from 'react-router-dom';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { useAuth } from '@/context/AuthContext';
import { ThemeSettingsSection } from '@/components/settings/ThemeSettingsSection';
import { PushNotificationsCard } from '@/components/settings/PushNotificationsCard';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { centsToDollars } from '@/lib/utils';

export function GeneralSettingsPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const { plan, isLoading } = useOrgPlan(orgId);
  const canManagePlan = user?.role === 'org_owner' || user?.role === 'platform_owner';

  return (
    <div className="max-w-2xl space-y-6">
      {canManagePlan && (
        <>
          {isLoading ? (
            <LoadingState />
          ) : plan ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-stone-600 dark:text-stone-300">
                <p>
                  <span className="font-medium text-stone-900 dark:text-stone-100">{plan.tierName}</span>
                  {' · '}${centsToDollars(plan.monthlyPriceCents)}/month
                </p>
                <p className="text-xs text-stone-500">
                  Compare included features and upgrade or downgrade from the plan page.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/orgs/${orgId}/settings/plan`}>View plans & change</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
      <ThemeSettingsSection />
      <PushNotificationsCard />
    </div>
  );
}
