/** Drag/resize snap increment (minutes). */
export const SNAP_MINUTES = 15;

/** Minimum appointment length when resizing via the calendar. */
export const MIN_RESIZE_DURATION_MINUTES = SNAP_MINUTES;

/** Exclusive end of a civil day in minutes. */
export const DAY_END_MINUTES = 24 * 60;

/** Wall-clock minute-of-day from an appointment ISO (UTC fields = civil time). */
export function utcWallClockMinutes(iso: string): number {
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return 0;
  return start.getUTCHours() * 60 + start.getUTCMinutes();
}

export function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

/**
 * Build an ISO timestamp whose UTC fields encode wall-clock date + time
 * (same convention as backend `combineDateAndTime` / `Date.UTC(y, m, d, h, min)`).
 */
export function minutesToIsoOnDay(dayKey: string, minutes: number): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const clamped = Math.max(0, minutes);
  const hours = Math.floor(clamped / 60);
  const mins = ((clamped % 60) + 60) % 60;
  return new Date(Date.UTC(year, month - 1, day, hours, mins)).toISOString();
}

/** Duration in whole minutes between two appointment ISO timestamps. */
export function durationMinutesBetween(startTime: string, endTime: string): number {
  const startMs = Date.parse(startTime);
  const endMs = Date.parse(endTime);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 1;
  return Math.max(1, Math.round((endMs - startMs) / 60_000));
}

export function endMinutesFromStart(startMinutes: number, durationMinutes: number): number {
  return startMinutes + durationMinutes;
}

export function clampMinutes(minutes: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, minutes));
}

/** Snap and clamp a move so the block stays within the civil day. */
export function clampMoveStart(startMinutes: number, durationMinutes: number): number {
  const safeDuration = Math.min(Math.max(durationMinutes, MIN_RESIZE_DURATION_MINUTES), DAY_END_MINUTES);
  const maxStart = Math.max(0, DAY_END_MINUTES - safeDuration);
  return clampMinutes(snapMinutes(startMinutes), 0, maxStart);
}

/** Snap and clamp a resize end so duration stays within bounds. */
export function clampResizeEnd(startMinutes: number, endMinutes: number): number {
  const minEnd = startMinutes + MIN_RESIZE_DURATION_MINUTES;
  const maxEnd = DAY_END_MINUTES;
  return clampMinutes(snapMinutes(endMinutes), minEnd, maxEnd);
}

export function appointmentDurationMinutes(startTime: string, endTime: string): number {
  const fromClock = utcWallClockMinutes(endTime) - utcWallClockMinutes(startTime);
  if (fromClock > 0 && startTime.slice(0, 10) === endTime.slice(0, 10)) return fromClock;
  return durationMinutesBetween(startTime, endTime);
}

/**
 * Exclusive end minute for painting a block. Wrap-around / multi-day ends
 * (e.g. 09:00 → next-day 00:00) stay on the civil day and never exceed midnight.
 */
export function resolveDisplayEndMinutes(startTime: string, endTime: string): number {
  const startMinutes = utcWallClockMinutes(startTime);
  const clockEnd = utcWallClockMinutes(endTime);
  if (clockEnd > startMinutes && startTime.slice(0, 10) === endTime.slice(0, 10)) {
    return clockEnd;
  }
  const duration = Math.min(appointmentDurationMinutes(startTime, endTime), DAY_END_MINUTES - startMinutes);
  return clampMinutes(startMinutes + duration, startMinutes + 1, DAY_END_MINUTES);
}

/** Keep a block inside the painted day column so it cannot overlay the rest of the page. */
export function clampBlockToGrid(
  startMinutes: number,
  endMinutes: number,
  gridStartMinutes: number,
  gridEndMinutes = DAY_END_MINUTES,
): { startMinutes: number; endMinutes: number } {
  const maxStart = Math.max(gridStartMinutes, gridEndMinutes - 1);
  const start = clampMinutes(startMinutes, gridStartMinutes, maxStart);
  const end = clampMinutes(endMinutes, start + 1, gridEndMinutes);
  return { startMinutes: start, endMinutes: end };
}

/** Convert a pointer delta in CSS pixels to calendar minutes. */
export function minutesFromPointerDelta(
  deltaPx: number,
  remPx: number,
  slotHeightRem: number,
  slotMinutes: number,
): number {
  if (!(remPx > 0) || !(slotHeightRem > 0) || !(slotMinutes > 0)) return 0;
  return (deltaPx / (slotHeightRem * remPx)) * slotMinutes;
}
