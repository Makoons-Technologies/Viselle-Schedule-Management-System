import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { formatDaysOfWeek, getDayOfWeekFromIso } from '@/lib/utils';
import type { RecurringFrequency } from '@/types/api';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { RecurringOptionsFields } from '@/components/appointments/RecurringOptionsFields';
import {
  isRecurringOptionsValid,
  recurringFrequencyDescription,
  recurringIntervalForFrequency,
} from '@/components/appointments/recurring-options';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MakeRecurringDialogProps {
  orgId: string;
  appointmentId: string;
  appointmentStartTime: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MakeRecurringDialog({
  orgId,
  appointmentId,
  appointmentStartTime,
  open,
  onOpenChange,
  onSuccess,
}: MakeRecurringDialogProps) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('weekly');
  const [customInterval, setCustomInterval] = useState('3');
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    setFrequency('weekly');
    setCustomInterval('3');
    setEndDate('');
    setSelectedDays([getDayOfWeekFromIso(appointmentStartTime)]);
    setConfirmOpen(false);
  }, [open, appointmentStartTime]);

  const interval = recurringIntervalForFrequency(frequency, customInterval);

  const toggleDay = (day: number) => {
    setSelectedDays((current) => {
      if (current.includes(day)) {
        if (current.length === 1) return current;
        return current.filter((value) => value !== day);
      }
      return [...current, day].sort((a, b) => a - b);
    });
  };

  const mutation = useMutation({
    mutationFn: () =>
      orgApi.makeAppointmentRecurring(orgId, appointmentId, {
        frequency,
        interval,
        endDate: endDate || undefined,
        daysOfWeek: selectedDays,
      }),
    onSuccess: (result) => {
      const total = result.createdAppointments.length;
      const extra = total - 1;
      toast.success(
        extra > 0
          ? `Recurring series created with ${total} appointments`
          : 'Recurring rule saved, but no additional time slots could be booked',
      );
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId, 'info'] });
      queryClient.invalidateQueries({ queryKey: ['recurring', orgId] });
      setConfirmOpen(false);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canContinue = isRecurringOptionsValid(frequency, customInterval, selectedDays);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
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
        description={`This appointment will become the first in a recurring series. Additional appointments will be generated ${recurringFrequencyDescription(frequency, interval)} on ${formatDaysOfWeek(selectedDays)} using the same staff member, customer, service, and time.${endDate ? ` The series will end on ${endDate}.` : ''} Future dates that conflict with availability or existing bookings will be skipped.`}
        confirmLabel="Create Series"
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
      />
    </>
  );
}
