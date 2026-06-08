import { X } from 'lucide-react';
import { WEEKDAY_OPTIONS, cn } from '@/lib/utils';
import type { RecurringFrequency } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RECURRING_FREQUENCY_OPTIONS } from '@/components/appointments/recurring-options';

interface RecurringOptionsFieldsProps {
  frequency: RecurringFrequency;
  onFrequencyChange: (frequency: RecurringFrequency) => void;
  customInterval: string;
  onCustomIntervalChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  selectedDays: number[];
  onToggleDay: (day: number) => void;
  compact?: boolean;
}

export function RecurringOptionsFields({
  frequency,
  onFrequencyChange,
  customInterval,
  onCustomIntervalChange,
  endDate,
  onEndDateChange,
  selectedDays,
  onToggleDay,
  compact = false,
}: RecurringOptionsFieldsProps) {
  return (
    <div className={cn('space-y-4', compact ? 'rounded-lg border border-stone-200 bg-stone-50 p-4' : undefined)}>
      {!compact && (
        <p className="text-sm text-stone-500">
          This appointment becomes the first occurrence. Future appointments are generated automatically.
        </p>
      )}
      <div>
        <Label>Frequency</Label>
        <Select value={frequency} onValueChange={(v) => onFrequencyChange(v as RecurringFrequency)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {RECURRING_FREQUENCY_OPTIONS.map((o) => (
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
            onChange={(e) => onCustomIntervalChange(e.target.value)}
          />
        </div>
      )}
      <div>
        <Label className="mb-2 block">Days of week</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_OPTIONS.map((day) => {
            const selected = selectedDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onToggleDay(day.value)}
                className={cn(
                  'min-w-12 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  selected
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300',
                )}
              >
                {day.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Select one or more days. Appointments repeat on these days using the same time as this booking.
        </p>
      </div>
      <div>
        <Label>End date (optional)</Label>
        <div className="relative mt-1">
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className={endDate ? 'pr-10' : undefined}
          />
          {endDate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0 text-stone-500 hover:text-stone-800"
              aria-label="Clear end date"
              onClick={() => onEndDateChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
