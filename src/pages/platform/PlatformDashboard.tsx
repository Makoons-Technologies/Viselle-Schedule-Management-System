import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Calendar, DollarSign, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ownerApi } from '@/lib/api';
import { formatDemoDateTime } from '@/lib/demo';
import { centsToDollars } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MrrChart } from '@/components/dashboard/MrrChart';

export function PlatformDashboard() {
  const { data: orgData, isLoading: orgsLoading } = useQuery({
    queryKey: ['owner', 'organizations'],
    queryFn: ownerApi.listOrganizations,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['owner', 'stats'],
    queryFn: ownerApi.getPlatformStats,
  });

  const demoRange = useMemo(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const { data: demoData } = useQuery({
    queryKey: ['owner', 'demo-bookings', demoRange.from, demoRange.to],
    queryFn: () => ownerApi.listDemoBookings(demoRange),
  });
  const upcomingDemos = (demoData?.bookings ?? []).filter((booking) => booking.status === 'scheduled').slice(0, 5);

  if (orgsLoading || statsLoading) return <LoadingState />;

  const orgs = orgData?.organizations ?? [];
  const liveOrgs = orgs.filter((o) => !o.isDev);
  const stats = statsData?.stats;
  const active = liveOrgs.filter((o) => o.status === 'active').length;

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        description="Overview of organizations, plans, and revenue on Viselle"
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link to="/platform/demos">Demo calendar</Link>
            </Button>
            <Button asChild>
              <Link to="/platform/organizations/new">New Organization</Link>
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">Live orgs</CardTitle>
            <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-2xl font-bold sm:text-3xl">{stats?.totalOrganizations ?? liveOrgs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">Active</CardTitle>
            <Users className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-2xl font-bold sm:text-3xl">{stats?.activeOrganizations ?? active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">On Trial</CardTitle>
            <Calendar className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-2xl font-bold sm:text-3xl">{stats?.trialOrganizations ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">Inactive</CardTitle>
            <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-2xl font-bold sm:text-3xl">
              {stats?.inactiveOrganizations ?? liveOrgs.filter((o) => o.status === 'inactive' || o.status === 'cancelled' || o.status === 'suspended').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">Billing on</CardTitle>
            <DollarSign className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-2xl font-bold sm:text-3xl">
              {stats?.billingActiveOrganizations ?? liveOrgs.filter((o) => o.billingStatus === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">Dev accounts</CardTitle>
            <Users className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-2xl font-bold sm:text-3xl">
              {stats?.devOrganizations ?? orgs.filter((o) => o.isDev).length}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">Est. MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-2xl font-bold sm:text-3xl">
              ${centsToDollars(stats?.estimatedMrrCents ?? 0).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Live active + trial orgs</p>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Organizations by plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              {(
                [
                  ['starter', 'Starter'],
                  ['professional', 'Professional'],
                  ['business', 'Business'],
                  ['custom', 'Custom / manual'],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50"
                >
                  <p className="text-sm text-stone-500 dark:text-stone-400">{label}</p>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {stats.organizationsByTier[key]}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Upcoming demos</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/platform/demos">Open calendar</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {upcomingDemos.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No booked demos in the next two weeks. They appear here after someone uses Request a demo.
            </p>
          ) : (
            <ul className="space-y-3">
              {upcomingDemos.map((booking) => (
                <li key={booking.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                  <span className="font-medium text-stone-900 dark:text-stone-100">{booking.name}</span>
                  <span className="text-sm text-stone-500 dark:text-stone-400">{formatDemoDateTime(booking.startsAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <MrrChart />
      </div>
    </div>
  );
}
