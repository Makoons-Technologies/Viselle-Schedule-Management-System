import { useOrgId } from '@/hooks/useOrgId';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { ThemeSettingsSection } from '@/components/settings/ThemeSettingsSection';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { centsToDollars } from '@/lib/utils';

export function GeneralSettingsPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const { plan, isLoading } = useOrgPlan(orgId);

  return (
    <div className="max-w-2xl space-y-6">
      {user?.role === 'org_owner' && (
        <>
          {isLoading ? (
            <LoadingState />
          ) : plan ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-stone-600 dark:text-stone-300">
                <p>
                  <span className="font-medium text-stone-900">{plan.tierName}</span>
                  {' · '}${centsToDollars(plan.monthlyPriceCents)}/month
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    Staff limit:{' '}
                    {plan.maxStaffAccounts >= 999 ? 'Unlimited' : `Up to ${plan.maxStaffAccounts}`}
                  </li>
                  <li>Email reminders: {plan.emailRemindersEnabled ? 'Included' : 'Not included'}</li>
                  <li>Text (SMS) reminders: {plan.smsRemindersEnabled ? 'Included' : 'Not included'}</li>
                  <li>Recurring appointments: {plan.recurringAppointmentsEnabled ? 'Included' : 'Not included'}</li>
                </ul>
                <p className="pt-2 text-xs text-stone-500 dark:text-stone-300">
                  Need more? Visit our{' '}
                  <a href="/#pricing" className="text-brand-700 hover:underline">
                    pricing page
                  </a>{' '}
                  or{' '}
                  <Link to="/contact?interest=upgrade" className="text-brand-700 hover:underline">
                    contact us to upgrade
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
      <ThemeSettingsSection />
    </div>
  );
}
