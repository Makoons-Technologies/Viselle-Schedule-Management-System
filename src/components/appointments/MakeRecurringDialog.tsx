import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import type { RecurringFrequency } from '@/types/api';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string; interval: number }[] = [
  { value: 'weekly', label: 'Weekly', interval: 1 },
  { value: 'biweekly', label: 'Every 2 weeks', interval: 2 },
  { value: 'monthly', label: 'Monthly', interval: 1 },
  { value: 'custom', label: 'Custom interval (weeks)', interval: 1 },
];

function frequencyDescription(frequency: RecurringFrequency, interval: number): string {
  switch (frequency) {
    case 'weekly':
      return 'every week';
    case 'biweekly':
      return 'every 2 weeks';
    case 'monthly':
      return 'every month';
    case 'custom':
      return `every ${interval} week${interval === 1 ? '' : 's'}`;
  }
}

interface MakeRecurringDialogProps {
  orgId: string;
  appointmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MakeRecurringDialog({
  orgId,
  appointmentId,
  open,
  onOpenChange,
  onSuccess,
}: MakeRecurringDialogProps) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('weekly');
  const [customInterval, setCustomInterval] = useState('3');
  const [endDate, setEndDate] = useState('');

  const selectedOption = FREQUENCY_OPTIONS.find((o) => o.value === frequency)!;
  const interval = frequency === 'custom' ? Number(customInterval) : selectedOption.interval;

  const mutation = useMutation({
    mutationFn: () =>
      orgApi.makeAppointmentRecurring(orgId, appointmentId, {
        frequency,
        interval,
        endDate: endDate || undefined,
      }),
    onSuccess: (result) => {
      const count = result.createdAppointments.length;
      toast.success(
        count === 1
          ? 'Recurring series created'
          : `Recurring series created with ${count} appointments`,
      );
      queryClient.invalidateQueries({ queryKey: ['appointments', orgId] });
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId, 'info'] });
      queryClient.invalidateQueries({ queryKey: ['recurring', orgId] });
      setConfirmOpen(false);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Recurring</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-stone-500">
              This appointment becomes the first occurrence. Future appointments are generated automatically.
            </p>
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {frequency === 'custom' && (
              <div>
                <Label>Repeat every (weeks)</Label>
                <Input
                  type="number"
                  min={1}
                  value={customInterval}
                  onChange={(e) => setCustomInterval(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label>End date (optional)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={frequency === 'custom' && (!customInterval || Number(customInterval) < 1)}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Create recurring series?"
        description={`This appointment will become the first in a recurring series. Additional appointments will be generated ${frequencyDescription(frequency, interval)} using the same staff member, customer, service, and time.${endDate ? ` The series will end on ${endDate}.` : ''} Future dates that conflict with availability or existing bookings will be skipped.`}
        confirmLabel="Create Series"
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
      />
    </>
  );
}
