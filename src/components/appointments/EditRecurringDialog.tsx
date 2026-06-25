import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { RecurringAppointmentRule, RecurringFrequency } from '@/types/api';
import { RecurringOptionsFields } from '@/components/appointments/RecurringOptionsFields';
import {
  customIntervalFromRule,
  dayTimesFromRule,
  dayTimesToApiPayload,
  daysOfWeekFromRule,
  formatDayTimesSummary,
  isRecurringOptionsValid,
  recurringIntervalForFrequency,
} from '@/components/appointments/recurring-options';
import { useRecurringDaySchedule } from '@/hooks/useRecurringDaySchedule';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditRecurringDialogProps {
  orgId: string;
  rule: RecurringAppointmentRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRecurringDialog({ orgId, rule, open, onOpenChange }: EditRecurringDialogProps) {
  const queryClient = useQueryClient();
  const [frequency, setFrequency] = useState<RecurringFrequency>('weekly');
  const [customInterval, setCustomInterval] = useState('3');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'active' | 'paused'>('active');

  const fallbackTime = rule
    ? (Object.values(dayTimesFromRule(rule))[0] ?? rule.startTime)
    : '09:00';

  const {
    selectedDays,
    dayTimes,
    resetSchedule,
    toggleDay,
    setDayTime,
    dayConflicts,
    hasConflicts,
    slotsLoading,
  } = useRecurringDaySchedule({
    orgId,
    accountId: rule?.accountId,
    serviceId: rule?.serviceId,
    timezone: rule?.timezone ?? 'America/New_York',
    fallbackTime,
    enabled: open && !!rule,
  });

  useEffect(() => {
    if (!open || !rule) return;
    const days = daysOfWeekFromRule(rule);
    const times = dayTimesFromRule(rule);
    setFrequency(rule.frequency);
    setCustomInterval(customIntervalFromRule(rule));
    setEndDate(rule.endDate ?? '');
    resetSchedule(days, times);
    setStatus(rule.status === 'paused' ? 'paused' : 'active');
  }, [open, rule?.id, rule, resetSchedule]);

  const interval = recurringIntervalForFrequency(frequency, customInterval);

  const mutation = useMutation({
    mutationFn: () =>
      orgApi.updateRecurring(orgId, rule!.id, {
        frequency,
        interval,
        endDate: endDate || null,
        daysOfWeek: selectedDays,
        dayTimes: dayTimesToApiPayload(dayTimes, selectedDays),
        status,
        syncFutureAppointments: false,
      }),
    onSuccess: () => {
      toast.success('Recurring rule updated');
      queryClient.invalidateQueries({ queryKey: ['recurring', orgId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSave =
    rule &&
    isRecurringOptionsValid(frequency, customInterval, selectedDays, dayTimes) &&
    !hasConflicts &&
    !slotsLoading;

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recurring Series</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
            <p>Series started {formatDate(rule.startDate)}</p>
            <p className="mt-1">Current schedule: {formatDayTimesSummary(daysOfWeekFromRule(rule), dayTimesFromRule(rule))}</p>
          </div>
          <RecurringOptionsFields
            frequency={frequency}
            onFrequencyChange={setFrequency}
            customInterval={customInterval}
            onCustomIntervalChange={setCustomInterval}
            endDate={endDate}
            onEndDateChange={setEndDate}
            selectedDays={selectedDays}
            onToggleDay={toggleDay}
            dayTimes={dayTimes}
            onDayTimeChange={setDayTime}
            dayConflicts={dayConflicts}
            defaultTime={fallbackTime}
          />
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as 'active' | 'paused')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-stone-500">
              Paused rules keep past occurrences visible but hide future ones on the calendar.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSave || mutation.isPending}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
