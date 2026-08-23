import { appointmentScheduleFromIso } from '@/lib/utils';

export const SLOT_MINUTES = 30;
/** Visual height of one 30-minute row on the week calendar. */
export const SLOT_HEIGHT_REM = 4;
/** Full civil day so 12am–noon (and evening) slots are always reachable. */
export const DEFAULT_DAY_START = 0;
export const DEFAULT_DAY_END = 24 * 60;

export function appointmentStartMinutes(iso: string): number {
  const { time } = appointmentScheduleFromIso(iso);
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Slot whose start is nearest `targetMinutes` (ties prefer the earlier start). */
export function closestAvailableSlot<T extends { startTime: string }>(
  slots: T[],
  targetMinutes: number,
): T | undefined {
  let best: T | undefined;
  let bestDist = Infinity;
  let bestMinutes = 0;
  for (const slot of slots) {
    const minutes = appointmentStartMinutes(slot.startTime);
    const dist = Math.abs(minutes - targetMinutes);
    if (!best || dist < bestDist || (dist === bestDist && minutes < bestMinutes)) {
      best = slot;
      bestDist = dist;
      bestMinutes = minutes;
    }
  }
  return best;
}

export interface WeekAppointmentCursor {
  dayKey: string;
  minutes: number;
}

/** Later booking on `dayKey` only (does not walk to the next day). */
export function nextAppointmentOnDay(
  appointments: Array<{ startTime: string }>,
  dayKey: string,
  afterMinutes: number,
): number | undefined {
  let nextMinutes: number | undefined;
  for (const appointment of appointments) {
    if (appointment.startTime.slice(0, 10) !== dayKey) continue;
    const minutes = appointmentStartMinutes(appointment.startTime);
    if (minutes <= afterMinutes) continue;
    if (nextMinutes === undefined || minutes < nextMinutes) nextMinutes = minutes;
  }
  return nextMinutes;
}

export function firstAppointmentOnDay(
  appointments: Array<{ startTime: string }>,
  dayKey: string,
): number | undefined {
  return nextAppointmentOnDay(appointments, dayKey, -1);
}

/** First booking on a later day than `afterDayKey`. */
export function firstAppointmentAfterDay(
  appointments: Array<{ startTime: string }>,
  dayKeys: string[],
  afterDayKey: string,
): WeekAppointmentCursor | undefined {
  const startIndex = dayKeys.indexOf(afterDayKey);
  const from = startIndex < 0 ? 0 : startIndex + 1;
  for (let i = from; i < dayKeys.length; i += 1) {
    const minutes = firstAppointmentOnDay(appointments, dayKeys[i]);
    if (minutes !== undefined) {
      return { dayKey: dayKeys[i], minutes };
    }
  }
  return undefined;
}

/**
 * Next appointment after `after`, walking `dayKeys` in order.
 * On the starting day only later clock times count; later days start from the first booking.
 */
export function nextAppointmentInWeekOrder(
  appointments: Array<{ startTime: string }>,
  dayKeys: string[],
  after: WeekAppointmentCursor,
): WeekAppointmentCursor | undefined {
  const sameDay = nextAppointmentOnDay(appointments, after.dayKey, after.minutes);
  if (sameDay !== undefined) {
    return { dayKey: after.dayKey, minutes: sameDay };
  }
  return firstAppointmentAfterDay(appointments, dayKeys, after.dayKey);
}

export function formatMinutesLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return new Date(Date.UTC(2000, 0, 1, hours, mins)).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/** Pixel/rem offset from the top of the day column for an absolute minute-of-day. */
export function minutesToOffsetRem(
  minutes: number,
  gridStartMinutes: number,
  slotMinutes = SLOT_MINUTES,
  slotHeightRem = SLOT_HEIGHT_REM,
): number {
  return ((minutes - gridStartMinutes) / slotMinutes) * slotHeightRem;
}

/** Map a click/tap Y offset inside a day column to a 30-minute slot. */
export function minutesFromGridOffset(
  offsetPx: number,
  remPx: number,
  gridStartMinutes: number,
  slotCount: number,
  slotHeightRem = SLOT_HEIGHT_REM,
  slotMinutes = SLOT_MINUTES,
): number {
  if (slotCount <= 0) return gridStartMinutes;
  const slotIndex = Math.min(
    slotCount - 1,
    Math.max(0, Math.floor(offsetPx / (slotHeightRem * remPx))),
  );
  return gridStartMinutes + slotIndex * slotMinutes;
}

export function appointmentBlockGeometry(
  startTime: string,
  endTime: string,
  gridStartMinutes: number,
  slotMinutes = SLOT_MINUTES,
  slotHeightRem = SLOT_HEIGHT_REM,
): { topRem: number; heightRem: number; startMinutes: number; endMinutes: number } {
  const startMinutes = appointmentStartMinutes(startTime);
  const endMinutes = Math.max(startMinutes + 1, appointmentStartMinutes(endTime));
  const topRem = minutesToOffsetRem(startMinutes, gridStartMinutes, slotMinutes, slotHeightRem);
  const heightRem = minutesToOffsetRem(endMinutes, gridStartMinutes, slotMinutes, slotHeightRem) - topRem;
  return { topRem, heightRem, startMinutes, endMinutes };
}

export function currentTimeMinutes(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function buildWeekTimeSlots(
  appointments: Array<{ startTime: string; endTime?: string }>,
  slotMinutes = SLOT_MINUTES,
  extraMinutes: number[] = [],
): number[] {
  let min = DEFAULT_DAY_START;
  let max = DEFAULT_DAY_END;

  for (const appointment of appointments) {
    const start = appointmentStartMinutes(appointment.startTime);
    const end = appointment.endTime
      ? appointmentStartMinutes(appointment.endTime)
      : start + slotMinutes;
    min = Math.min(min, start);
    max = Math.max(max, end);
  }

  for (const minutes of extraMinutes) {
    min = Math.min(min, minutes);
    max = Math.max(max, minutes + slotMinutes);
  }

  min = Math.floor(min / slotMinutes) * slotMinutes;
  max = Math.ceil(max / slotMinutes) * slotMinutes;

  if (max <= min) {
    return Array.from(
      { length: (DEFAULT_DAY_END - DEFAULT_DAY_START) / slotMinutes },
      (_, index) => DEFAULT_DAY_START + index * slotMinutes,
    );
  }

  const slots: number[] = [];
  for (let time = min; time < max; time += slotMinutes) {
    slots.push(time);
  }
  return slots;
}

export function groupAppointmentsByDay<T extends { startTime: string }>(
  appointments: T[],
  dayKeys: string[],
): Map<string, T[]> {
  const byDay = new Map<string, T[]>();

  for (const appointment of appointments) {
    const dayKey = appointment.startTime.slice(0, 10);
    if (!dayKeys.includes(dayKey)) continue;
    const list = byDay.get(dayKey) ?? [];
    list.push(appointment);
    byDay.set(dayKey, list);
  }

  for (const list of byDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return byDay;
}

export interface PositionedAppointment<T> {
  appointment: T;
  topRem: number;
  heightRem: number;
  /** Shared key for the connected overlap group (empty when alone). */
  stackKey: string;
  /** 0-based index within the overlap stack (stable: start time, then id). */
  stackIndex: number;
  /** Size of the connected overlap group (1 when alone). */
  stackSize: number;
}

type TimedAppointment = { startTime: string; endTime: string; id?: string };

function appointmentIdentity(appointment: TimedAppointment, fallbackIndex: number): string {
  return appointment.id ?? `${appointment.startTime}:${appointment.endTime}:${fallbackIndex}`;
}

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Place appointments with exact start/end offsets.
 * Overlapping items form a connected stack (full-width layering), not side-by-side lanes.
 */
export function layoutDayAppointments<T extends TimedAppointment>(
  appointments: T[],
  gridStartMinutes: number,
  slotMinutes = SLOT_MINUTES,
  slotHeightRem = SLOT_HEIGHT_REM,
): PositionedAppointment<T>[] {
  const placed = appointments
    .map((appointment, index) => {
      const geometry = appointmentBlockGeometry(
        appointment.startTime,
        appointment.endTime,
        gridStartMinutes,
        slotMinutes,
        slotHeightRem,
      );
      return {
        appointment,
        identity: appointmentIdentity(appointment, index),
        ...geometry,
      };
    })
    .sort((a, b) => {
      const byStart = a.startMinutes - b.startMinutes;
      if (byStart !== 0) return byStart;
      return a.identity.localeCompare(b.identity);
    });

  const parent = placed.map((_, index) => index);
  const find = (index: number): number => {
    if (parent[index] !== index) parent[index] = find(parent[index]);
    return parent[index];
  };
  const unite = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      if (placed[j].startMinutes >= placed[i].endMinutes) break;
      if (
        intervalsOverlap(
          placed[i].startMinutes,
          placed[i].endMinutes,
          placed[j].startMinutes,
          placed[j].endMinutes,
        )
      ) {
        unite(i, j);
      }
    }
  }

  const clusters = new Map<number, number[]>();
  for (let i = 0; i < placed.length; i += 1) {
    const root = find(i);
    const members = clusters.get(root) ?? [];
    members.push(i);
    clusters.set(root, members);
  }

  const stackMeta = new Map<number, { stackKey: string; stackIndex: number; stackSize: number }>();
  for (const members of clusters.values()) {
    const stackSize = members.length;
    const stackKey =
      stackSize > 1
        ? members
            .map((index) => placed[index].identity)
            .sort()
            .join('|')
        : '';
    members.forEach((index, stackIndex) => {
      stackMeta.set(index, { stackKey, stackIndex, stackSize });
    });
  }

  return placed.map((item, index) => {
    const meta = stackMeta.get(index) ?? { stackKey: '', stackIndex: 0, stackSize: 1 };
    return {
      appointment: item.appointment,
      topRem: item.topRem,
      heightRem: item.heightRem,
      ...meta,
    };
  });
}
