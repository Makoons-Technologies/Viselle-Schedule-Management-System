import { appointmentStartMinutes } from '@/components/calendar/week-time-grid';

/** Drag/resize snap increment (minutes). */
export const SNAP_MINUTES = 15;

/** Minimum appointment length when resizing via the calendar. */
export const MIN_RESIZE_DURATION_MINUTES = SNAP_MINUTES;

/** Exclusive end of a civil day in minutes. */
export const DAY_END_MINUTES = 24 * 60;

export function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

/**
 * Build an ISO timestamp whose UTC fields encode wall-clock date + time
 * (same convention as backend `combineDateAndTime` / `Date.UTC(y, m, d, h, min)`).
 */
export function minutesToIsoOnDay(dayKey: string, minutes: number): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const hours = Math.floor(minutes / 60);
  const mins = ((minutes % 60) + 60) % 60;
  return new Date(Date.UTC(year, month - 1, day, hours, mins)).toISOString();
}

/** Duration in whole minutes between two appointment ISO timestamps. */
export function durationMinutesBetween(startTime: string, endTime: string): number {
  return Math.max(
    1,
    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000),
  );
}

export function endMinutesFromStart(startMinutes: number, durationMinutes: number): number {
  return startMinutes + durationMinutes;
}

export function clampMinutes(minutes: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, minutes));
}

/** Snap and clamp a move so the block stays within the civil day. */
export function clampMoveStart(startMinutes: number, durationMinutes: number): number {
  const maxStart = Math.max(0, DAY_END_MINUTES - durationMinutes);
  return clampMinutes(snapMinutes(startMinutes), 0, maxStart);
}

/** Snap and clamp a resize end so duration stays within bounds. */
export function clampResizeEnd(startMinutes: number, endMinutes: number): number {
  const minEnd = startMinutes + MIN_RESIZE_DURATION_MINUTES;
  const maxEnd = DAY_END_MINUTES;
  return clampMinutes(snapMinutes(endMinutes), minEnd, maxEnd);
}

export function appointmentDurationMinutes(startTime: string, endTime: string): number {
  const fromClock = appointmentStartMinutes(endTime) - appointmentStartMinutes(startTime);
  if (fromClock > 0) return fromClock;
  return durationMinutesBetween(startTime, endTime);
}
