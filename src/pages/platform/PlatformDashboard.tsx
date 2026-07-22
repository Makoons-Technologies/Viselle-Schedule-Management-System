import { useQuery } from '@tanstack/react-query';
import { Building2, Calendar, DollarSign, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ownerApi } from '@/lib/api';
import { centsToDollars } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PlatformDashboard() {
  const { data: orgData, isLoading: orgsLoading } = useQuery({
    queryKey: ['owner', 'organizations'],
    queryFn: ownerApi.listOrganizations,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['owner', 'stats'],
    queryFn: ownerApi.getPlatformStats,
  });

  if (orgsLoading || statsLoading) return <LoadingState />;

  const orgs = orgData?.organizations ?? [];
  const stats = statsData?.stats;
  const active = orgs.filter((o) => o.status === 'active').length;

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        description="Overview of organizations, plans, and revenue on Viselle"
        actions={
          <Button asChild>
            <Link to="/platform/organizations/new">New Organization</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.totalOrganizations ?? orgs.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">Active</CardTitle>
            <Users className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.activeOrganizations ?? active}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">On Trial</CardTitle>
            <Calendar className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.trialOrganizations ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">Est. MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${centsToDollars(stats?.estimatedMrrCents ?? 0).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Active + trial orgs</p>
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
    </div>
  );
}
