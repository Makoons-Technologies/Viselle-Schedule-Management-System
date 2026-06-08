import { useQuery } from '@tanstack/react-query';
import { Building2, Calendar, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ownerApi } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PlatformDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'organizations'],
    queryFn: ownerApi.listOrganizations,
  });

  if (isLoading) return <LoadingState />;

  const orgs = data?.organizations ?? [];
  const active = orgs.filter((o) => o.status === 'active').length;

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        description="Manage all organizations on the Viselle platform"
        actions={
          <Button asChild>
            <Link to="/platform/organizations/new">New Organization</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{orgs.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Active</CardTitle>
            <Users className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{active}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Trial / Other</CardTitle>
            <Calendar className="h-4 w-4 text-brand-600" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{orgs.length - active}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
