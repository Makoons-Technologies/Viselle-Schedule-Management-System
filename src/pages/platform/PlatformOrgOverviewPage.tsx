import { useQuery } from '@tanstack/react-query';
import { Calendar, DollarSign, Scissors, UserCircle, Users } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { orgApi, ownerApi } from '@/lib/api';
import { centsToDollars, formatDate } from '@/lib/utils';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { BillingStatusBadge, OrganizationStatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PlatformOrgOverviewPage() {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', orgId, 'platform_owner'],
    queryFn: () => ownerApi.getOrganization(orgId!),
    enabled: !!orgId,
  });

  const { data: billingData, isLoading: billingLoading } = useQuery({
    queryKey: ['owner-billing', orgId],
    queryFn: () => ownerApi.getBilling(orgId!),
    enabled: !!orgId,
  });

  const { plan, isLoading: planLoading } = useOrgPlan(orgId);

  const { data: appointments, isLoading: apptsLoading } = useQuery({
    queryKey: ['appointments', orgId],
    queryFn: () => orgApi.listAppointments(orgId!),
    enabled: !!orgId,
  });

  const { data: staff } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId!),
    enabled: !!orgId,
  });

  const { data: services } = useQuery({
    queryKey: ['services', orgId],
    queryFn: () => orgApi.listServices(orgId!),
    enabled: !!orgId,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId!),
    enabled: !!orgId,
  });

  if (!orgId) return null;
  if (orgLoading || billingLoading || planLoading || apptsLoading) return <LoadingState />;

  const org = orgData?.organization;
  if (!org) return null;

  const upcoming = (appointments?.appointments ?? []).filter(
    (a) => a.visitStatus !== 'cancelled' && new Date(a.startTime) > new Date(),
  ).length;

  const stats = [
    { label: 'Upcoming appointments', value: upcoming, icon: Calendar },
    { label: 'Staff members', value: staff?.accounts.length ?? 0, icon: Users },
    { label: 'Services', value: services?.services.length ?? 0, icon: Scissors },
    { label: 'Customers', value: customers?.customers.length ?? 0, icon: UserCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-500">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-stone-500">Status</span>
              <OrganizationStatusBadge status={org.status} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-stone-500">Billing</span>
              <BillingStatusBadge status={billingData?.billing.billingStatus ?? org.billingStatus} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-stone-500">Created</span>
              <span className="font-medium text-stone-900">{formatDate(org.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-stone-500">Public booking</span>
              <span className="font-medium text-stone-900">
                {org.publicBookingEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Plan</CardTitle>
            <DollarSign className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-stone-600">
            {plan ? (
              <>
                <p>
                  <span className="font-medium text-stone-900">{plan.tierName}</span>
                  {' · '}${centsToDollars(plan.monthlyPriceCents)}/month
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    Staff limit:{' '}
                    {plan.maxStaffAccounts >= 999
                      ? 'Unlimited'
                      : plan.maxStaffAccounts === 0
                        ? 'Owner only'
                        : `Up to ${plan.maxStaffAccounts}`}
                  </li>
                  <li>Email reminders: {plan.emailRemindersEnabled ? 'Yes' : 'No'}</li>
                  <li>SMS reminders: {plan.smsRemindersEnabled ? 'Yes' : 'No'}</li>
                  <li>Recurring: {plan.recurringAppointmentsEnabled ? 'Yes' : 'No'}</li>
                </ul>
              </>
            ) : (
              <p className="text-stone-500">Plan details unavailable.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
