import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function centsToDollars(cents: number) {
  return cents / 100;
}

export function formatCompactCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

export function dollarsToCents(dollars: number) {
  return Math.round(dollars * 100);
}

/** Appointments encode wall-clock date/time in UTC fields (see backend combineDateAndTime). */
export function appointmentScheduleFromIso(iso: string): { date: string; time: string } {
  const start = new Date(iso);
  return {
    date: iso.slice(0, 10),
    time: `${String(start.getUTCHours()).padStart(2, '0')}:${String(start.getUTCMinutes()).padStart(2, '0')}`,
  };
}

function utcWallClockDate(iso: string): Date {
  const { date, time } = appointmentScheduleFromIso(iso);
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
}

export function formatDateTime(iso: string) {
  return utcWallClockDate(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function formatDate(iso: string) {
  const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : iso.slice(0, 10);
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Long weekday + month date for appointment detail views (UTC wall-clock date). */
export function formatLongDate(iso: string) {
  const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : iso.slice(0, 10);
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatTime(iso: string) {
  const start = new Date(iso);
  const hours = start.getUTCHours();
  const minutes = start.getUTCMinutes();
  return new Date(Date.UTC(2000, 0, 1, hours, minutes)).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function formatTimeRange(startIso: string, endIso: string) {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
] as const;

export function getDayOfWeekFromIso(startTime: string, _timezone?: string): number {
  const startDate = startTime.slice(0, 10);
  const [year, month, day] = startDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function formatDaysOfWeek(days: number[]): string {
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => DAY_NAMES[day])
    .join(', ');
}

export function daysInRange(startDay: number, endDay: number): number[] {
  if (endDay < startDay) return [];
  return Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i);
}

export const TIME_INPUT_INTERVAL_MINUTES = 10;
export const TIME_INPUT_STEP_SECONDS = TIME_INPUT_INTERVAL_MINUTES * 60;

/** Snap HH:mm to the nearest booking interval (default 10 minutes). */
export function snapTimeToInterval(
  time: string,
  intervalMinutes: number = TIME_INPUT_INTERVAL_MINUTES,
): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;

  const totalMinutes = hours * 60 + minutes;
  const snapped = Math.round(totalMinutes / intervalMinutes) * intervalMinutes;
  const normalized = ((snapped % (24 * 60)) + 24 * 60) % (24 * 60);
  const nextHours = Math.floor(normalized / 60);
  const nextMinutes = normalized % 60;

  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

/** Slots store wall-clock date/time in UTC field components (matches backend combineDateAndTime). */
export function slotStartWallClockMs(iso: string): number {
  const slot = new Date(iso);
  return Date.UTC(
    slot.getUTCFullYear(),
    slot.getUTCMonth(),
    slot.getUTCDate(),
    slot.getUTCHours(),
    slot.getUTCMinutes(),
    slot.getUTCSeconds(),
    slot.getUTCMilliseconds(),
  );
}

export function wallClockNowMs(now = new Date()): number {
  return Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );
}

export function isAppointmentStartInPast(startTimeIso: string, now = new Date()): boolean {
  return slotStartWallClockMs(startTimeIso) <= wallClockNowMs(now);
}

/**
 * Start time for a walk-in: the next whole local minute, encoded the way
 * appointments store wall-clock date/time in UTC field components.
 * One minute ahead so `isAppointmentStartInPast` (uses <=) does not reject "now".
 */
export function walkInStartTimeIso(now = new Date()): string {
  const next = new Date(now.getTime() + 60_000);
  next.setSeconds(0, 0);
  return new Date(
    Date.UTC(
      next.getFullYear(),
      next.getMonth(),
      next.getDate(),
      next.getHours(),
      next.getMinutes(),
      0,
      0,
    ),
  ).toISOString();
}

export function todayDateOnlyLocal(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function filterFutureAppointmentSlots<T extends { startTime: string }>(
  slots: T[],
  now = new Date(),
): T[] {
  const nowMs = wallClockNowMs(now);
  return slots.filter((slot) => slotStartWallClockMs(slot.startTime) > nowMs);
}
