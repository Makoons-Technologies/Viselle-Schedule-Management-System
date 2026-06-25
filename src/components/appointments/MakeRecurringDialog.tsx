import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { getDayOfWeekFromIso } from '@/lib/utils';
import type { RecurringFrequency } from '@/types/api';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { RecurringOptionsFields } from '@/components/appointments/RecurringOptionsFields';
import {
  dayTimesToApiPayload,
  defaultTimeFromIso,
  formatDayTimesSummary,
  isRecurringOptionsValid,
  recurringFrequencyDescription,
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

const DEFAULT_TIMEZONE = 'America/New_York';

interface MakeRecurringDialogProps {
  orgId: string;
  appointmentId: string;
  appointmentStartTime: string;
  accountId: string;
  serviceId: string;
  timezone?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MakeRecurringDialog({
  orgId,
  appointmentId,
  appointmentStartTime,
  accountId,
  serviceId,
  timezone = DEFAULT_TIMEZONE,
  open,
  onOpenChange,
  onSuccess,
}: MakeRecurringDialogProps) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('weekly');
  const [customInterval, setCustomInterval] = useState('3');
  const [endDate, setEndDate] = useState('');

  const defaultTime = defaultTimeFromIso(appointmentStartTime);
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
    accountId,
    serviceId,
    timezone,
    fallbackTime: defaultTime,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const day = getDayOfWeekFromIso(appointmentStartTime);
    setFrequency('weekly');
    setCustomInterval('3');
    setEndDate('');
    resetSchedule([day], { [day]: defaultTime }, defaultTime);
    setConfirmOpen(false);
  }, [open, appointmentStartTime, defaultTime, resetSchedule]);

  const interval = recurringIntervalForFrequency(frequency, customInterval);

  const mutation = useMutation({
    mutationFn: () =>
      orgApi.makeAppointmentRecurring(orgId, appointmentId, {
        frequency,
        interval,
        endDate: endDate || undefined,
        daysOfWeek: selectedDays,
        dayTimes: dayTimesToApiPayload(dayTimes, selectedDays),
      }),
    onSuccess: () => {
      toast.success('Recurring series created');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId, 'info'] });
      queryClient.invalidateQueries({ queryKey: ['recurring', orgId] });
      setConfirmOpen(false);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canContinue =
    isRecurringOptionsValid(frequency, customInterval, selectedDays, dayTimes) &&
    !hasConflicts &&
    !slotsLoading;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Make Recurring</DialogTitle>
          </DialogHeader>
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
            defaultTime={defaultTime}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={!canContinue}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Create recurring series?"
        description={`This appointment will become the first in a recurring series. Additional appointments will be generated ${recurringFrequencyDescription(frequency, interval)} on ${formatDayTimesSummary(selectedDays, dayTimes)} using the same staff member, customer, and service.${endDate ? ` The series will end on ${endDate}.` : ''} Future dates that conflict with existing bookings will be skipped.`}
        confirmLabel="Create Series"
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
      />
    </>
  );
}
