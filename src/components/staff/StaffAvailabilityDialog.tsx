import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import type { Account } from '@/types/api';
import { AvailabilityWeekCalendar } from '@/components/availability/AvailabilityWeekCalendar';
import { LoadingState } from '@/components/common/LoadingState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StaffAvailabilityDialogProps {
  orgId: string;
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaffAvailabilityDialog({
  orgId,
  account,
  open,
  onOpenChange,
}: StaffAvailabilityDialogProps) {
  const queryClient = useQueryClient();
  const accountId = account?.id ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['availability-rules', orgId, accountId],
    queryFn: () => orgApi.listAvailabilityRules(orgId, accountId),
    enabled: open && !!orgId && !!accountId,
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
    mutationFn: (ruleId: string) => orgApi.deleteAvailabilityRule(orgId, accountId, ruleId),
    onSuccess: () => {
      toast.success('Availability block removed');
      queryClient.invalidateQueries({ queryKey: ['availability-rules', orgId, accountId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rules = data?.availabilityRules ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account ? `${account.firstName} ${account.lastName}'s availability` : 'Availability'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Weekly bookable hours by day. Multiple blocks on the same day are allowed when times do not overlap.
        </p>
        {isLoading ? (
          <LoadingState />
        ) : (
          <AvailabilityWeekCalendar
            rules={rules}
            onAdd={async (payload) => {
              await createMutation.mutateAsync(payload);
            }}
            onRemove={(ruleId) => deleteMutation.mutate(ruleId)}
            adding={createMutation.isPending}
            removingRuleId={deleteMutation.isPending ? deleteMutation.variables : null}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
