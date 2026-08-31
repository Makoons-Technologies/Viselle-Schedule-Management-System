import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Trash2, Users, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import type { Account, AccountRole, AccountStatus } from '@/types/api';
import { CreateStaffDialog } from '@/components/staff/CreateStaffDialog';
import { StaffAvailabilityDialog } from '@/components/staff/StaffAvailabilityDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ListToolbar, matchesSearch } from '@/components/common/ListToolbar';
import { TableIconButton, TableRowActions } from '@/components/common/TableIconButton';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type RoleFilter = AccountRole | 'all';
type StatusFilter = AccountStatus | 'all';

export function StaffPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { plan, isError: planError, error: planLoadError, refetch: refetchPlan } = useOrgPlan(orgId);
  const trialExpired = useOrgWriteLocked();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Account | null>(null);
  const [availabilityTarget, setAvailabilityTarget] = useState<Account | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const openCreate = () => {
    setEditingAccount(null);
    setDialogOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId,
  });

  const payoutSettingsQuery = useQuery({
    queryKey: ['staff-payouts', orgId],
    queryFn: () => orgApi.getStaffPayoutSettings(orgId),
    enabled: !!orgId,
  });
  const payoutOptedIn = payoutSettingsQuery.data?.mode === 'salon_stripe';

  const removeMutation = useMutation({
    mutationFn: (accountId: string) => orgApi.deleteAccount(orgId, accountId),
    onSuccess: () => {
      toast.success('Staff member removed');
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      setRemoveTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const accounts = data?.accounts ?? [];
  const filtered = useMemo(
    () =>
      accounts.filter((a) => {
        if (roleFilter !== 'all' && a.role !== roleFilter) return false;
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        return matchesSearch(search, a.firstName, a.lastName, a.email, a.role);
      }),
    [accounts, search, roleFilter, statusFilter],
  );

  if (isLoading) return <LoadingState />;

  const activeStaffCount = accounts.filter((a) => a.role !== 'org_owner' && a.status === 'active').length;
  const staffLimit = plan?.maxStaffAccounts ?? null;
  const atStaffLimit = staffLimit !== null && activeStaffCount >= staffLimit;

  const canManageLogin = (account: Account) => account.role !== 'org_owner';

  const canRemove = (account: Account) =>
    account.role !== 'org_owner' && account.id !== user?.accountId;

  return (
    <div className="mx-auto max-w-3xl">
      <SettingsBackHeader
        title="Staff"
        backTo={`/orgs/${orgId}/settings`}
        actions={
          <TrialLockedControl locked={trialExpired}>
            <Button onClick={openCreate} disabled={trialExpired || atStaffLimit}>
              <Plus className="h-4 w-4" /> Add Staff
            </Button>
          </TrialLockedControl>
        }
      />
      {planError ? (
        <p className="-mt-2 mb-4 text-sm text-red-700 dark:text-red-300" role="alert">
          {getApiErrorMessage(planLoadError, 'Could not load plan limits.')}{' '}
          <button type="button" className="font-medium underline" onClick={() => void refetchPlan()}>
            Retry
          </button>
        </p>
      ) : null}
      {staffLimit !== null ? (
        <p className="-mt-2 mb-4 text-sm text-stone-500">
          {staffLimit === 0
            ? 'Owner only — additional staff aren’t included on this plan.'
            : `${activeStaffCount} of ${staffLimit >= 999 ? 'unlimited' : staffLimit} staff accounts used`}
        </p>
      ) : null}
      {atStaffLimit && (
        <p className="mb-4 text-sm text-amber-800">
          {staffLimit === 0
            ? 'Your plan only includes the organization owner.'
            : `You've reached your staff limit on the ${plan?.tierName ?? 'current'} plan.`}{' '}
          <a href="/#pricing" className="font-medium text-brand-700 hover:underline">
            Upgrade your plan
          </a>{' '}
          to add {staffLimit === 0 ? 'team members' : 'more team members'}.
        </p>
      )}
      {accounts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff members"
          action={
            <TrialLockedControl locked={trialExpired}>
              <Button onClick={openCreate} disabled={trialExpired}>Add Staff</Button>
            </TrialLockedControl>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, email…"
            filters={
              <>
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="org_owner">Org owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
          />
          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="No staff match" description="Try a different search or filter." />
          ) : (
            <Panel>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bookable</TableHead>
                    {payoutOptedIn ? <TableHead>Payout bank</TableHead> : null}
                    <TableHead>Login</TableHead>
                    <TableHead className="w-[116px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.firstName} {a.lastName}</TableCell>
                      <TableCell className="text-stone-500 dark:text-stone-400">{a.email}</TableCell>
                      <TableCell className="capitalize">{a.role.replace('_', ' ')}</TableCell>
                      <TableCell><Badge variant={a.status === 'active' ? 'success' : 'secondary'}>{a.status}</Badge></TableCell>
                      <TableCell>{a.isBookable ? 'Yes' : 'No'}</TableCell>
                      {payoutOptedIn ? (
                        <TableCell>
                          <Badge variant={a.stripeRecipientPayoutsReady ? 'success' : 'secondary'}>
                            {a.stripeRecipientPayoutsReady ? 'Ready' : 'Needs bank'}
                          </Badge>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        {a.userId ? (
                          <Badge variant="success">Enabled</Badge>
                        ) : canManageLogin(a) ? (
                          <Badge variant="secondary">Not set</Badge>
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TableRowActions>
                          <TrialLockedControl locked={trialExpired}>
                            <TableIconButton
                              icon={Clock}
                              label="Manage availability"
                              onClick={() => setAvailabilityTarget(a)}
                              disabled={trialExpired}
                            />
                          </TrialLockedControl>
                          <TrialLockedControl locked={trialExpired}>
                            <TableIconButton
                              icon={Wrench}
                              label="Edit staff member"
                              onClick={() => openEdit(a)}
                              disabled={trialExpired}
                            />
                          </TrialLockedControl>
                          {canRemove(a) ? (
                            <TrialLockedControl locked={trialExpired}>
                              <TableIconButton
                                icon={Trash2}
                                label="Remove staff member"
                                variant="ghost"
                                destructive
                                onClick={() => setRemoveTarget(a)}
                                disabled={trialExpired}
                              />
                            </TrialLockedControl>
                          ) : null}
                        </TableRowActions>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          )}
        </>
      )}
      <CreateStaffDialog
        orgId={orgId}
        account={editingAccount}
        existingAccountIds={accounts.map((a) => a.id)}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingAccount(null);
        }}
      />
      <StaffAvailabilityDialog
        orgId={orgId}
        account={availabilityTarget}
        open={!!availabilityTarget}
        onOpenChange={(open) => !open && setAvailabilityTarget(null)}
        trialLocked={trialExpired}
      />
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove staff member?"
        description={
          removeTarget
            ? `${removeTarget.firstName} ${removeTarget.lastName} will be removed from your team and can no longer be booked for appointments.`
            : ''
        }
        confirmLabel="Remove"
        destructive
        loading={removeMutation.isPending}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
      />
    </div>
  );
}
