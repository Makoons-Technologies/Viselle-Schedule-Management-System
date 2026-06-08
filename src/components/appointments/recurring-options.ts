import type { RecurringFrequency } from '@/types/api';

export const RECURRING_FREQUENCY_OPTIONS: {
  value: RecurringFrequency;
  label: string;
  interval: number;
}[] = [
  { value: 'weekly', label: 'Weekly', interval: 1 },
  { value: 'biweekly', label: 'Every 2 weeks', interval: 2 },
  { value: 'monthly', label: 'Monthly', interval: 1 },
  { value: 'custom', label: 'Custom interval (weeks)', interval: 1 },
];

export function recurringFrequencyDescription(
  frequency: RecurringFrequency,
  interval: number,
): string {
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

export function recurringIntervalForFrequency(
  frequency: RecurringFrequency,
  customInterval: string,
): number {
  if (frequency === 'custom') return Number(customInterval);
  return RECURRING_FREQUENCY_OPTIONS.find((o) => o.value === frequency)!.interval;
}

export function isRecurringOptionsValid(
  frequency: RecurringFrequency,
  customInterval: string,
  selectedDays: number[],
): boolean {
  if (selectedDays.length === 0) return false;
  if (frequency === 'custom' && (!customInterval || Number(customInterval) < 1)) return false;
  return true;
}
