import { useEffect, useState } from 'react';
import type { AvailabilityRule } from '@/types/api';
import {
  findOverlappingAvailabilityRule,
  validateAvailabilityBlock,
} from '@/lib/availability';
import { DAY_NAMES } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TimeInput } from '@/components/ui/time-input';
import { Label } from '@/components/ui/label';

interface AddAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayOfWeek: number | null;
  existingRules: AvailabilityRule[];
  loading?: boolean;
  onSubmit: (data: { dayOfWeek: number; startTime: string; endTime: string }) => void | Promise<void>;
}

export function AddAvailabilityDialog({
  open,
  onOpenChange,
  dayOfWeek,
  existingRules,
  loading = false,
  onSubmit,
}: AddAvailabilityDialogProps) {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    setStartTime('09:00');
    setEndTime('17:00');
    setError(undefined);
  }, [open, dayOfWeek]);

  const handleSubmit = async () => {
    if (dayOfWeek === null) return;

    const validationError = validateAvailabilityBlock(startTime, endTime);
    if (validationError) {
      setError(validationError);
      return;
    }

    const overlap = findOverlappingAvailabilityRule(existingRules, dayOfWeek, startTime, endTime);
    if (overlap) {
      setError('This block overlaps existing hours on the same day. Adjust the times or remove the other block first.');
      return;
    }

    setError(undefined);
    await onSubmit({ dayOfWeek, startTime, endTime });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add hours{dayOfWeek !== null ? ` — ${DAY_NAMES[dayOfWeek]}` : ''}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-stone-500">
          You can add multiple blocks on the same day as long as the times do not overlap.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Start</Label>
            <TimeInput value={startTime} onChange={setStartTime} />
          </div>
          <div>
            <Label>End</Label>
            <TimeInput value={endTime} onChange={setEndTime} />
          </div>
        </div>
        {error && <p className="text-sm text-amber-700">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || dayOfWeek === null}>
            Add Block
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
