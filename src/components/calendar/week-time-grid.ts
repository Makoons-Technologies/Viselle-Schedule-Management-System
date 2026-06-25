import { appointmentScheduleFromIso } from '@/lib/utils';

export const SLOT_MINUTES = 30;
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

export function slotForAppointmentStart(startTime: string, slotMinutes = SLOT_MINUTES): number {
  const minutes = appointmentStartMinutes(startTime);
  return Math.floor(minutes / slotMinutes) * slotMinutes;
}

export function buildWeekTimeSlots(
  appointments: Array<{ startTime: string }>,
  slotMinutes = SLOT_MINUTES,
): number[] {
  let min = DEFAULT_DAY_START;
  let max = DEFAULT_DAY_END;

  for (const appointment of appointments) {
    const start = appointmentStartMinutes(appointment.startTime);
    min = Math.min(min, start);
    max = Math.max(max, start + slotMinutes);
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

export function groupAppointmentsByDayAndSlot<T extends { startTime: string }>(
  appointments: T[],
  dayKeys: string[],
  slotMinutes = SLOT_MINUTES,
): Map<string, T[]> {
  const byDayAndSlot = new Map<string, T[]>();

  for (const appointment of appointments) {
    const dayKey = appointment.startTime.slice(0, 10);
    if (!dayKeys.includes(dayKey)) continue;
    const slot = slotForAppointmentStart(appointment.startTime, slotMinutes);
    const key = `${dayKey}:${slot}`;
    const list = byDayAndSlot.get(key) ?? [];
    list.push(appointment);
    byDayAndSlot.set(key, list);
  }

  for (const list of byDayAndSlot.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return byDayAndSlot;
}
