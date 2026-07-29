import { useQuery } from '@tanstack/react-query';
import { Calendar, Scissors, UserCircle, Users } from 'lucide-react';
import { orgApi } from '@/lib/api';
import { useOrgId } from '@/hooks/useOrgId';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardTrialStatus } from '@/components/dashboard/DashboardTrialStatus';
import { RevenueChart } from '@/components/dashboard/RevenueChart';

export function OrgDashboard() {
  const orgId = useOrgId();

  const { data: appointments, isLoading: loadingAppts } = useQuery({
    queryKey: ['appointments', orgId],
    queryFn: () => orgApi.listAppointments(orgId),
    enabled: !!orgId,
  });

  const { data: staff } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId,
  });

  const { data: services } = useQuery({
    queryKey: ['services', orgId],
    queryFn: () => orgApi.listServices(orgId),
    enabled: !!orgId,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId,
  });

  if (loadingAppts) return <LoadingState />;

  const upcoming = (appointments?.appointments ?? []).filter(
    (a) => a.visitStatus !== 'cancelled' && new Date(a.startTime) > new Date(),
  ).length;

  const stats = [
    { label: 'Upcoming Appointments', value: upcoming, icon: Calendar },
    { label: 'Staff Members', value: staff?.accounts.length ?? 0, icon: Users },
    { label: 'Services', value: services?.services.length ?? 0, icon: Scissors },
    { label: 'Customers', value: customers?.customers.length ?? 0, icon: UserCircle },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Organization overview and key metrics" />
      <DashboardTrialStatus />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{s.value}</p></CardContent>
          </Card>
        ))}
      </div>

      {orgId && (
        <div className="mt-6">
          <RevenueChart orgId={orgId} />
        </div>
      )}
    </div>
  );
}
