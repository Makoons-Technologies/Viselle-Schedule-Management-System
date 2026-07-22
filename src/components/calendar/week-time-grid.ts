import { appointmentScheduleFromIso } from '@/lib/utils';

export const SLOT_MINUTES = 30;
/** Visual height of one 30-minute row on the week calendar. */
export const SLOT_HEIGHT_REM = 3;
const DEFAULT_DAY_START = 8 * 60;
const DEFAULT_DAY_END = 18 * 60;

export function appointmentStartMinutes(iso: string): number {
  const { time } = appointmentScheduleFromIso(iso);
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
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

export function buildWeekTimeSlots(
  appointments: Array<{ startTime: string; endTime?: string }>,
  slotMinutes = SLOT_MINUTES,
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
  /** 0-based lane within overlapping peers. */
  lane: number;
  /** Lane count for overlapping peers (controls width). */
  laneCount: number;
}

/**
 * Place appointments with exact start/end offsets; overlapping items share horizontal lanes.
 */
export function layoutDayAppointments<T extends { startTime: string; endTime: string }>(
  appointments: T[],
  gridStartMinutes: number,
  slotMinutes = SLOT_MINUTES,
  slotHeightRem = SLOT_HEIGHT_REM,
): PositionedAppointment<T>[] {
  const sorted = [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const laneEnds: number[] = [];
  const placed: Array<{
    appointment: T;
    startMinutes: number;
    endMinutes: number;
    topRem: number;
    heightRem: number;
    lane: number;
  }> = [];

  for (const appointment of sorted) {
    const geometry = appointmentBlockGeometry(
      appointment.startTime,
      appointment.endTime,
      gridStartMinutes,
      slotMinutes,
      slotHeightRem,
    );
    let lane = laneEnds.findIndex((end) => end <= geometry.startMinutes);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(geometry.endMinutes);
    } else {
      laneEnds[lane] = geometry.endMinutes;
    }
    placed.push({ appointment, lane, ...geometry });
  }

  return placed.map((item) => {
    let maxLane = item.lane;
    for (const other of placed) {
      if (other.startMinutes < item.endMinutes && other.endMinutes > item.startMinutes) {
        maxLane = Math.max(maxLane, other.lane);
      }
    }
    return {
      appointment: item.appointment,
      topRem: item.topRem,
      heightRem: item.heightRem,
      lane: item.lane,
      laneCount: maxLane + 1,
    };
  });
}
