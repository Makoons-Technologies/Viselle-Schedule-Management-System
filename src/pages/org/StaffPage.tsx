import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import type { Account } from '@/types/api';
import { CreateStaffDialog } from '@/components/staff/CreateStaffDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function StaffPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { plan } = useOrgPlan(orgId);
  const [createOpen, setCreateOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Account | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId,
  });

  const removeMutation = useMutation({
    mutationFn: (accountId: string) => orgApi.deleteAccount(orgId, accountId),
    onSuccess: () => {
      toast.success('Staff member removed');
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      setRemoveTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState />;

  const accounts = data?.accounts ?? [];
  const activeStaffCount = accounts.filter((a) => a.role === 'staff' && a.status === 'active').length;
  const staffLimit = plan?.maxStaffAccounts ?? null;
  const atStaffLimit = staffLimit !== null && activeStaffCount >= staffLimit;

  const canRemove = (account: Account) =>
    account.role !== 'org_owner' && account.id !== user?.accountId;

  return (
    <div className="mx-auto max-w-3xl">
      <SettingsBackHeader
        title="Staff"
        backTo={`/orgs/${orgId}/settings`}
        actions={
          <Button onClick={() => setCreateOpen(true)} disabled={atStaffLimit}>
            <Plus className="h-4 w-4" /> Add Staff
          </Button>
        }
      />
      {staffLimit ? (
        <p className="-mt-2 mb-4 text-sm text-stone-500">
          {activeStaffCount} of {staffLimit >= 999 ? 'unlimited' : staffLimit} staff accounts used
        </p>
      ) : null}
      {atStaffLimit && (
        <p className="mb-4 text-sm text-amber-800">
          You&apos;ve reached your staff limit on the {plan?.tierName ?? 'current'} plan.{' '}
          <a href="/#pricing" className="font-medium text-brand-700 hover:underline">
            Upgrade your plan
          </a>{' '}
          to add more team members.
        </p>
      )}
      {accounts.length === 0 ? (
        <EmptyState icon={Users} title="No staff members" action={<Button onClick={() => setCreateOpen(true)}>Add Staff</Button>} />
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
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.firstName} {a.lastName}</TableCell>
                  <TableCell className="text-stone-500">{a.email}</TableCell>
                  <TableCell className="capitalize">{a.role.replace('_', ' ')}</TableCell>
                  <TableCell><Badge variant={a.status === 'active' ? 'success' : 'secondary'}>{a.status}</Badge></TableCell>
                  <TableCell>{a.isBookable ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    {canRemove(a) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => setRemoveTarget(a)}
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </Button>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}
      <CreateStaffDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />
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
