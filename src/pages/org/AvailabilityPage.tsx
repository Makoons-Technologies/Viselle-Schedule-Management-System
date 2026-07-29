import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { AvailabilityWeekCalendar } from '@/components/availability/AvailabilityWeekCalendar';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AvailabilityPage() {
  const orgId = useOrgId();
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

  return (
    <div className="mx-auto max-w-3xl">
      <SettingsBackHeader title="Availability" backTo={`/orgs/${orgId}/settings`} />
      <p className="-mt-2 mb-6 text-sm text-stone-500">
        Weekly bookable hours by day. Multiple blocks on the same day are allowed when times do not overlap.
      </p>
      <div className="mb-6 max-w-sm">
        <Label>Staff member</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.firstName} {account.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!accountId ? (
        <p className="text-sm text-stone-500">Select a staff member to manage their weekly availability.</p>
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
