import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Plus, Settings } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TableIconButton, TableRowActions } from '@/components/common/TableIconButton';
import { Panel } from '@/components/common/Panel';
import { PageHeader } from '@/components/common/PageHeader';
import { OrganizationStatusBadge, BillingStatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function OrganizationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { setSelectedOrgId } = useOrg();
  const [orgToDeactivate, setOrgToDeactivate] = useState<{ id: string; name: string } | null>(null);
  const isPlatformOwner = user?.role === 'platform_owner';

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'organizations'],
    queryFn: ownerApi.listOrganizations,
    enabled: isPlatformOwner,
  });

  if (!isPlatformOwner) {
    if (user?.role === 'org_owner' && user.organizationId) {
      return <Navigate to={`/orgs/${user.organizationId}/dashboard`} replace />;
    }
    return <Navigate to="/" replace />;
  }

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => ownerApi.deactivateOrganization(id),
    onSuccess: () => {
      toast.success('Organization deactivated');
      queryClient.invalidateQueries({ queryKey: ['owner', 'organizations'] });
      setOrgToDeactivate(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="View and manage all tenant organizations"
        actions={
          <Button asChild>
            <Link to="/platform/organizations/new"><Plus className="h-4 w-4" /> New</Link>
          </Button>
        }
      />
      <Panel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.organizations ?? []).map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell className="text-stone-500">{org.slug}</TableCell>
                <TableCell><OrganizationStatusBadge status={org.status} /></TableCell>
                <TableCell><BillingStatusBadge status={org.billingStatus} /></TableCell>
                <TableCell className="text-stone-500">{formatDate(org.createdAt)}</TableCell>
                <TableCell>
                  <TableRowActions>
                    <TableIconButton label="Manage organization" asChild>
                      <Link to={`/orgs/${org.id}/dashboard`} onClick={() => setSelectedOrgId(org.id)}>
                        <Settings className="h-4 w-4" />
                      </Link>
                    </TableIconButton>
                    {org.status === 'active' && (
                      <TableIconButton
                        icon={Ban}
                        label="Deactivate organization"
                        variant="ghost"
                        destructive
                        onClick={() => setOrgToDeactivate({ id: org.id, name: org.name })}
                      />
                    )}
                  </TableRowActions>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
      <ConfirmDialog
        open={!!orgToDeactivate}
        onOpenChange={(open) => !open && setOrgToDeactivate(null)}
        title="Deactivate organization?"
        description={
          orgToDeactivate
            ? `Deactivate ${orgToDeactivate.name}? Staff and owners will lose access, and public booking will be disabled.`
            : ''
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivateMutation.isPending}
        onConfirm={() => orgToDeactivate && deactivateMutation.mutate(orgToDeactivate.id)}
      />
    </div>
  );
}
