import { appointmentScheduleFromIso } from '@/lib/utils';

export function nextDateForDayOfWeek(
  dayOfWeek: number,
  fromDate = new Date().toISOString().slice(0, 10),
): string {
  const [year, month, day] = fromDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const currentDay = date.getUTCDay();
  const delta = (dayOfWeek - currentDay + 7) % 7;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function slotStartTimes(slots: Array<{ startTime: string }>): string[] {
  return [...new Set(slots.map((slot) => appointmentScheduleFromIso(slot.startTime).time))].sort(
    (a, b) => timeToMinutes(a) - timeToMinutes(b),
  );
}

export function findBestAvailableTime(candidate: string, available: string[]): string | null {
  if (available.length === 0) return null;
  if (available.includes(candidate)) return candidate;

  const candidateMinutes = timeToMinutes(candidate);
  const sorted = [...available].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  return sorted.find((time) => timeToMinutes(time) >= candidateMinutes) ?? sorted[0] ?? null;
}

export function resolveTimeForNewDay(
  candidate: string,
  availableTimes: string[] | undefined,
): string {
  if (!availableTimes || availableTimes.length === 0) return candidate;
  return findBestAvailableTime(candidate, availableTimes) ?? candidate;
}

export function getDayTimeConflict(
  time: string | undefined,
  availableTimes: string[] | undefined,
  options: { loading?: boolean; canValidate?: boolean },
): string | undefined {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return 'Enter a valid time';
  if (!options.canValidate || options.loading) return undefined;
  if (!availableTimes || availableTimes.length === 0) {
    return 'No open slots on this day for the selected staff and service';
  }
  if (!availableTimes.includes(time)) {
    return 'This time conflicts with existing bookings or availability';
  }
  return undefined;
}
