import { X } from 'lucide-react';
import { DAY_NAMES, WEEKDAY_OPTIONS, cn } from '@/lib/utils';
import type { RecurringFrequency } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimeInput } from '@/components/ui/time-input';
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
  dayTimes: Record<number, string>;
  onDayTimeChange: (day: number, time: string) => void;
  dayConflicts?: Record<number, string | undefined>;
  defaultTime?: string;
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
  dayTimes,
  onDayTimeChange,
  dayConflicts,
  defaultTime = '09:00',
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
          Select one or more days. New days default to your last set time when that slot is available.
        </p>
      </div>
      {selectedDays.length > 0 && (
        <div className="space-y-2">
          <Label>Time for each day</Label>
          {[...selectedDays].sort((a, b) => a - b).map((day) => (
            <div key={day} className="space-y-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-sm text-stone-600 sm:w-24">
                  {WEEKDAY_OPTIONS.find((option) => option.value === day)?.label ?? DAY_NAMES[day]}
                </span>
                <TimeInput
                  className={cn(
                    'w-full max-w-none sm:max-w-40 bg-white',
                    dayConflicts?.[day] && 'border-amber-500 focus-visible:ring-amber-500',
                  )}
                  value={dayTimes[day] ?? defaultTime}
                  onChange={(time) => onDayTimeChange(day, time)}
                />
              </div>
              {dayConflicts?.[day] && (
                <p className="text-xs text-amber-700 sm:pl-24">{dayConflicts[day]}</p>
              )}
            </div>
          ))}
        </div>
      )}
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
