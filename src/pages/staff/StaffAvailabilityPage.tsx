import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AvailabilityWeekCalendar } from '@/components/availability/AvailabilityWeekCalendar';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';

export function StaffAvailabilityPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = user?.organizationId ?? '';
  const accountId = user?.accountId ?? '';
  const { permissions } = useStaffPermissions(orgId);
  const trialExpired = useOrgWriteLocked();
  const canEdit = permissions.canManageOwnSchedule;
  const [removingRuleId, setRemovingRuleId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['availability-rules', orgId, accountId],
    queryFn: () => orgApi.listAvailabilityRules(orgId, accountId),
    enabled: !!orgId && !!accountId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { dayOfWeek: number; startTime: string; endTime: string }) =>
      orgApi.createAvailabilityRule(orgId, accountId, payload),
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

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Hours"
        description={
          canEdit
            ? 'Your weekly bookable hours'
            : 'Your weekly bookable hours (view only — contact your manager to make changes)'
        }
      />
      <AvailabilityWeekCalendar
        rules={data?.availabilityRules ?? []}
        readOnly={!canEdit}
        onAdd={canEdit ? async (payload) => { await createMutation.mutateAsync(payload); } : undefined}
        onRemove={canEdit ? (ruleId) => deleteMutation.mutate(ruleId) : undefined}
        adding={createMutation.isPending}
        removingRuleId={removingRuleId}
        trialLocked={trialExpired}
      />
    </div>
  );
}
