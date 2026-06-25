import type { RecurringAppointmentRule, RecurringFrequency } from '@/types/api';
import { appointmentScheduleFromIso, DAY_NAMES, getDayOfWeekFromIso, WEEKDAY_OPTIONS } from '@/lib/utils';
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

export function defaultTimeFromIso(iso: string): string {
  return appointmentScheduleFromIso(iso).time;
}
export function isRecurringOptionsValid(
  frequency: RecurringFrequency,
  customInterval: string,
  selectedDays: number[],
  dayTimes: Record<number, string>,
): boolean {
  if (selectedDays.length === 0) return false;
  if (frequency === 'custom' && (!customInterval || Number(customInterval) < 1)) return false;
  return selectedDays.every((day) => /^\d{2}:\d{2}$/.test(dayTimes[day] ?? ''));
}

export function customIntervalFromRule(rule: RecurringAppointmentRule): string {
  return rule.frequency === 'custom' ? String(rule.interval) : '3';
}

export function daysOfWeekFromRule(rule: RecurringAppointmentRule): number[] {
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    return [...rule.daysOfWeek].sort((a, b) => a - b);
  }

  const fromDayTimes = rule.dayTimes
    ? Object.keys(rule.dayTimes)
        .map(Number)
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  if (fromDayTimes.length > 0) {
    return [...new Set(fromDayTimes)].sort((a, b) => a - b);
  }

  const [year, month, day] = rule.startDate.split('-').map(Number);
  return [new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function dayTimesFromRule(rule: RecurringAppointmentRule): Record<number, string> {
  const days = daysOfWeekFromRule(rule);
  const result: Record<number, string> = {};
  for (const day of days) {
    result[day] = rule.dayTimes?.[String(day)] ?? rule.startTime;
  }
  return result;
}

/** Skipped dates whose occurrence time has not passed yet (for display only). */
export function upcomingSkippedDatesFromRule(
  rule: RecurringAppointmentRule,
  now: Date = new Date(),
): string[] {
  const dayTimes = dayTimesFromRule(rule);

  return (rule.skippedDates ?? [])
    .filter((date) => {
      const dayOfWeek = getDayOfWeekFromIso(date);
      const time = dayTimes[dayOfWeek] ?? rule.startTime;
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      const occurrenceStart = new Date(Date.UTC(year, month - 1, day, hours, minutes));
      return occurrenceStart > now;
    })
    .sort();
}

export function dayTimesToApiPayload(
  dayTimes: Record<number, string>,
  selectedDays: number[],
): Record<string, string> {
  return Object.fromEntries(selectedDays.map((day) => [String(day), dayTimes[day] ?? '09:00']));
}

export function toggleRecurringDay(
  day: number,
  selectedDays: number[],
  dayTimes: Record<number, string>,
  defaultTime: string,
): { selectedDays: number[]; dayTimes: Record<number, string> } {
  if (selectedDays.includes(day)) {
    if (selectedDays.length === 1) return { selectedDays, dayTimes };
    const nextDays = selectedDays.filter((value) => value !== day);
    const { [day]: _removed, ...restTimes } = dayTimes;
    return { selectedDays: nextDays, dayTimes: restTimes };
  }

  return {
    selectedDays: [...selectedDays, day].sort((a, b) => a - b),
    dayTimes: { ...dayTimes, [day]: dayTimes[day] ?? defaultTime },
  };
}

export function formatDayTimesSummary(
  selectedDays: number[],
  dayTimes: Record<number, string>,
): string {
  return [...selectedDays]
    .sort((a, b) => a - b)
    .map((day) => {
      const label = WEEKDAY_OPTIONS.find((option) => option.value === day)?.label ?? DAY_NAMES[day];
      return `${label} ${dayTimes[day] ?? '—'}`;
    })
    .join(', ');
}
