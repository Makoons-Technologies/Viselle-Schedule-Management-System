import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { AvailabilityWeekCalendar } from '@/components/availability/AvailabilityWeekCalendar';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AvailabilityPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const trialExpired = useOrgWriteLocked();
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState('');
  const [removingRuleId, setRemovingRuleId] = useState<string | null>(null);

  const { data: accountsData } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId,
  });

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['availability-rules', orgId, accountId],
    queryFn: () => orgApi.listAvailabilityRules(orgId, accountId),
    enabled: !!orgId && !!accountId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { dayOfWeek: number; startTime: string; endTime: string }) =>
      orgApi.createAvailabilityRule(orgId, accountId, data),
    onSuccess: () => {
      toast.success('Availability block added');
      queryClient.invalidateQueries({ queryKey: ['availability-rules', orgId, accountId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => {
      setRemovingRuleId(ruleId);
      return orgApi.deleteAvailabilityRule(orgId, accountId, ruleId);
    },
    onSuccess: () => {
      toast.success('Availability block removed');
      queryClient.invalidateQueries({ queryKey: ['availability-rules', orgId, accountId] });
      setRemovingRuleId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setRemovingRuleId(null);
    },
  });

  const accounts = accountsData?.accounts ?? [];
  const rules = rulesData?.availabilityRules ?? [];

  useEffect(() => {
    if (accountId || accounts.length === 0) return;
    const membershipAccountId = user?.memberships?.find((m) => m.organizationId === orgId)?.accountId;
    const self =
      accounts.find((account) => account.id === user?.accountId) ??
      accounts.find((account) => account.id === membershipAccountId) ??
      accounts.find((account) => account.role === 'org_owner' && account.userId === user?.id) ??
      (user?.role === 'org_owner' ? accounts.find((account) => account.role === 'org_owner') : undefined);
    if (self) setAccountId(self.id);
  }, [accounts, accountId, user, orgId]);

  return (
    <div className="mx-auto max-w-3xl">
      <SettingsBackHeader title="Hours" backTo={`/orgs/${orgId}/settings`} />
      <p className="-mt-2 mb-6 text-sm text-stone-500">
        Set your weekly bookable hours, or pick another staff member. Multiple blocks on the same day are allowed when times do not overlap.
      </p>
      <div className="mb-6 max-w-sm">
        <Label>Whose hours</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
          <SelectContent>
            {accounts.map((account) => {
              const isYou = account.id === user?.accountId || (account.role === 'org_owner' && account.userId === user?.id);
              const ownerLabel = account.role === 'org_owner' ? 'owner' : null;
              const suffix = [isYou ? 'you' : null, ownerLabel].filter(Boolean).join(', ');
              return (
                <SelectItem key={account.id} value={account.id}>
                  {account.firstName} {account.lastName}
                  {suffix ? ` (${suffix})` : ''}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      {!accountId ? (
        <p className="text-sm text-stone-500">Choose someone to manage their weekly availability.</p>
      ) : isLoading ? (
        <LoadingState />
      ) : (
        <AvailabilityWeekCalendar
          rules={rules}
          onAdd={async (data) => {
            await createMutation.mutateAsync(data);
          }}
          onRemove={(ruleId) => deleteMutation.mutate(ruleId)}
          adding={createMutation.isPending}
          removingRuleId={removingRuleId}
          trialLocked={trialExpired}
        />
      )}
    </div>
  );
}
