import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Building2, FlaskConical, LogIn, Plus, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError, ownerApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ListToolbar, matchesSearch } from '@/components/common/ListToolbar';
import { TableIconButton, TableRowActions } from '@/components/common/TableIconButton';
import { Panel } from '@/components/common/Panel';
import { PageHeader } from '@/components/common/PageHeader';
import {
  OrganizationStatusBadge,
  BillingStatusBadge,
  WebsiteHostingBadge,
} from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { BillingStatus, Organization, OrganizationStatus } from '@/types/api';

type StatusFilter = OrganizationStatus | 'all';
type BillingFilter = BillingStatus | 'all';

export function OrganizationsPage() {
  const { user, loginAsOwner } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setSelectedOrgId } = useOrg();
  const [orgToDeactivate, setOrgToDeactivate] = useState<{ id: string; name: string } | null>(null);
  const [impersonatingOrgId, setImpersonatingOrgId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [billingFilter, setBillingFilter] = useState<BillingFilter>('all');
  const isPlatformOwner = user?.role === 'platform_owner';

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'organizations'],
    queryFn: ownerApi.listOrganizations,
    enabled: isPlatformOwner,
  });

  const organizations = data?.organizations ?? [];
  const { liveOrgs, devOrgs } = useMemo(() => {
    const matches = (org: Organization) => {
      if (statusFilter !== 'all' && org.status !== statusFilter) return false;
      if (billingFilter !== 'all' && org.billingStatus !== billingFilter) return false;
      return matchesSearch(search, org.name, org.slug);
    };
    return {
      liveOrgs: organizations.filter((org) => !org.isDev && matches(org)),
      devOrgs: organizations.filter((org) => Boolean(org.isDev) && matches(org)),
    };
  }, [organizations, search, statusFilter, billingFilter]);

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

  const impersonateMutation = useMutation({
    mutationFn: (id: string) => loginAsOwner(id),
    onMutate: (id: string) => setImpersonatingOrgId(id),
    onSuccess: ({ organization }) => {
      setSelectedOrgId(organization.id);
      navigate(`/orgs/${organization.id}/dashboard`);
    },
    onError: (err: unknown, orgId: string) => {
      if (err instanceof ApiError && err.code === 'NO_ORG_OWNER') {
        toast.error(err.message, {
          action: {
            label: 'Invite owner',
            onClick: () => {
              setSelectedOrgId(orgId);
              navigate(`/platform/orgs/${orgId}/settings`);
            },
          },
        });
        return;
      }
      toast.error(err instanceof ApiError ? err.message : 'Could not log in as owner');
    },
    onSettled: () => setImpersonatingOrgId(null),
  });

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Live tenants stay here. Seeded QA orgs are listed separately under Dev accounts."
        actions={
          <Button asChild>
            <Link to="/platform/organizations/new"><Plus className="h-4 w-4" /> New</Link>
          </Button>
        }
      />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, slug…"
        filters={
          <>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={billingFilter} onValueChange={(v) => setBillingFilter(v as BillingFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Billing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All billing</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="past_due">Past due</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Live organizations</h2>
      {liveOrgs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={organizations.some((o) => !o.isDev) ? 'No organizations match' : 'No live organizations'}
          description={organizations.some((o) => !o.isDev) ? 'Try a different search or filter.' : 'Customer tenants appear here. Dev/test orgs are below.'}
        />
      ) : (
        <OrgTable
          orgs={liveOrgs}
          impersonatingOrgId={impersonatingOrgId}
          onSelectOrg={setSelectedOrgId}
          onImpersonate={(org) => {
            if (org.hasOwner === false) {
              setSelectedOrgId(org.id);
              navigate(`/platform/orgs/${org.id}/settings`);
              toast.message('Invite an owner first', {
                description: 'Open Org owner on this page to send a set-password email.',
              });
              return;
            }
            impersonateMutation.mutate(org.id);
          }}
          onDeactivate={(org) => setOrgToDeactivate({ id: org.id, name: org.name })}
        />
      )}

      <h2 className="mb-3 mt-10 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
        <FlaskConical className="h-4 w-4" />
        Dev accounts
      </h2>
      {devOrgs.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No dev accounts match"
          description="Seeded QA tenants are tagged is_dev and listed here."
        />
      ) : (
        <OrgTable
          orgs={devOrgs}
          showDevBadge
          impersonatingOrgId={impersonatingOrgId}
          onSelectOrg={setSelectedOrgId}
          onImpersonate={(org) => {
            if (org.hasOwner === false) {
              setSelectedOrgId(org.id);
              navigate(`/platform/orgs/${org.id}/settings`);
              toast.message('Invite an owner first', {
                description: 'Open Org owner on this page to send a set-password email.',
              });
              return;
            }
            impersonateMutation.mutate(org.id);
          }}
          onDeactivate={(org) => setOrgToDeactivate({ id: org.id, name: org.name })}
        />
      )}
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

function OrgTable({
  orgs,
  showDevBadge,
  impersonatingOrgId,
  onSelectOrg,
  onImpersonate,
  onDeactivate,
}: {
  orgs: Organization[];
  showDevBadge?: boolean;
  impersonatingOrgId: string | null;
  onSelectOrg: (id: string) => void;
  onImpersonate: (org: Organization) => void;
  onDeactivate: (org: Organization) => void;
}) {
  return (
    <Panel>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Billing</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orgs.map((org) => (
            <TableRow key={org.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {showDevBadge ? <Badge variant="outline">DEV</Badge> : null}
                  <Link
                    to={`/platform/orgs/${org.id}`}
                    onClick={() => onSelectOrg(org.id)}
                    className="text-stone-900 hover:text-brand-700 hover:underline dark:text-stone-100 dark:hover:text-brand-300"
                  >
                    {org.name}
                  </Link>
                </div>
              </TableCell>
              <TableCell className="text-stone-500">{org.slug}</TableCell>
              <TableCell><OrganizationStatusBadge status={org.status} /></TableCell>
              <TableCell><BillingStatusBadge status={org.billingStatus} /></TableCell>
              <TableCell>
                <WebsiteHostingBadge
                  hostingMode={org.hostingMode}
                  customWebsiteRequested={org.customWebsiteRequested}
                />
              </TableCell>
              <TableCell className="text-stone-500">{formatDate(org.createdAt)}</TableCell>
              <TableCell>
                <TableRowActions>
                  <TableIconButton label="Organization admin settings" asChild>
                    <Link to={`/platform/orgs/${org.id}/settings`} onClick={() => onSelectOrg(org.id)}>
                      <Settings className="h-4 w-4" />
                    </Link>
                  </TableIconButton>
                  <TableIconButton
                    icon={LogIn}
                    label={
                      org.hasOwner === false
                        ? 'No owner yet — open settings to invite'
                        : 'Log in as owner'
                    }
                    onClick={() => onImpersonate(org)}
                    disabled={impersonatingOrgId === org.id}
                  />
                  {(org.status === 'active' || org.status === 'trial') && (
                    <TableIconButton
                      icon={Ban}
                      label="Deactivate organization"
                      variant="ghost"
                      destructive
                      onClick={() => onDeactivate(org)}
                    />
                  )}
                </TableRowActions>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
