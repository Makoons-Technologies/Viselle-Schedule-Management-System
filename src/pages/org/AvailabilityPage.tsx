import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
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
import type { AuthUser } from '@/types/api';

function loggedInAccountId(user: AuthUser | null | undefined, orgId: string): string {
  if (!user) return '';
  if (user.accountId) return user.accountId;
  return user.memberships?.find((membership) => membership.organizationId === orgId)?.accountId ?? '';
}

export function AvailabilityPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const trialExpired = useOrgWriteLocked();
  const queryClient = useQueryClient();
  const selfAccountId = loggedInAccountId(user, orgId);
  const canViewOthers = user?.role === 'org_owner' || user?.role === 'platform_owner';
  const [accountId, setAccountId] = useState(selfAccountId);
  const [removingRuleId, setRemovingRuleId] = useState<string | null>(null);

  const { data: accountsData } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId && canViewOthers,
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
    setAccountId(selfAccountId);
  }, [orgId, selfAccountId]);

  if (user?.role === 'staff') {
    return <Navigate to="/staff/availability" replace />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SettingsBackHeader title="Hours" backTo={`/orgs/${orgId}/settings`} />
      <p className="-mt-2 mb-6 text-sm text-stone-500">
        {canViewOthers
          ? 'Your hours are selected first. Switch to another staff member only if you need to edit theirs. Multiple blocks on the same day are allowed when times do not overlap.'
          : 'Your weekly bookable hours. Multiple blocks on the same day are allowed when times do not overlap.'}
      </p>
      {canViewOthers ? (
        <div className="mb-6 max-w-sm">
          <Label>Whose hours</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
            <SelectContent>
              {accounts.map((account) => {
                const isYou = account.id === selfAccountId;
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
      ) : null}
      {!accountId ? (
        <p className="text-sm text-stone-500">
          {canViewOthers
            ? 'Choose someone to manage their weekly availability.'
            : 'Your staff profile is still loading.'}
        </p>
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
