import type { AvailabilityRule } from '@/types/api';

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatAvailabilityTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(Date.UTC(2000, 0, 1, hours, minutes)).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function availabilityRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}

export function validateAvailabilityBlock(
  startTime: string,
  endTime: string,
): string | undefined {
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return 'Enter valid start and end times';
  }
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return 'End time must be after start time';
  }
  return undefined;
}

export function findOverlappingAvailabilityRule(
  rules: AvailabilityRule[],
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeRuleId?: string,
): AvailabilityRule | undefined {
  return rules.find(
    (rule) =>
      rule.isActive &&
      rule.dayOfWeek === dayOfWeek &&
      rule.id !== excludeRuleId &&
      availabilityRangesOverlap(startTime, endTime, rule.startTime, rule.endTime),
  );
}

export function rulesForDay(rules: AvailabilityRule[], dayOfWeek: number): AvailabilityRule[] {
  return rules
    .filter((rule) => rule.isActive && rule.dayOfWeek === dayOfWeek)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

export const AVAILABILITY_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
