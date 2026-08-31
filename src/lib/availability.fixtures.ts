import {
  dayOfWeekFromDayKey,
  isCalendarSlotInHours,
  isSlotWithinHours,
} from '@/lib/availability';
import type { AvailabilityRule } from '@/types/api';

function fakeRule(
  dayOfWeek: AvailabilityRule['dayOfWeek'],
  startTime: string,
  endTime: string,
  isActive = true,
): AvailabilityRule {
  return {
    id: `${dayOfWeek}-${startTime}-${endTime}-${isActive}`,
    organizationId: 'org',
    accountId: 'acct',
    dayOfWeek,
    startTime,
    endTime,
    isActive,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** Monday / Sunday civil keys used by the week calendar. */
const MONDAY = '2026-08-24';
const SUNDAY = '2026-08-23';

function assertAvailabilityFixtures(): void {
  if (dayOfWeekFromDayKey(MONDAY) !== 1) {
    throw new Error('2026-08-24 must be Monday in local civil time');
  }
  if (dayOfWeekFromDayKey(SUNDAY) !== 0) {
    throw new Error('2026-08-23 must be Sunday in local civil time');
  }

  const weekday = [fakeRule(1, '09:00', '17:00')];
  if (!isCalendarSlotInHours(weekday, MONDAY, 9 * 60)) {
    throw new Error('09:00 must be inside 09:00–17:00 hours');
  }
  if (!isCalendarSlotInHours(weekday, MONDAY, 16 * 60 + 30)) {
    throw new Error('16:30 must still be inside hours that end at 17:00');
  }
  if (isCalendarSlotInHours(weekday, MONDAY, 17 * 60)) {
    throw new Error('17:00 must be outside hours that end at 17:00');
  }
  if (isCalendarSlotInHours(weekday, MONDAY, 8 * 60 + 30)) {
    throw new Error('08:30 must be outside 09:00–17:00 hours');
  }
  if (isCalendarSlotInHours(weekday, SUNDAY, 10 * 60)) {
    throw new Error('Sunday must be outside hours when only Monday is set');
  }

  const split = [fakeRule(1, '09:00', '12:00'), fakeRule(1, '13:00', '17:00')];
  if (isCalendarSlotInHours(split, MONDAY, 12 * 60) || isCalendarSlotInHours(split, MONDAY, 12 * 60 + 30)) {
    throw new Error('lunch gap 12:00–13:00 must be outside hours');
  }
  if (!isCalendarSlotInHours(split, MONDAY, 13 * 60)) {
    throw new Error('13:00 must be inside the afternoon block');
  }

  const inactive = [fakeRule(1, '09:00', '17:00', false)];
  if (isCalendarSlotInHours(inactive, MONDAY, 10 * 60)) {
    throw new Error('inactive hours must not unlock calendar slots');
  }

  if (!isSlotWithinHours(10 * 60, [{ startTime: '09:00', endTime: '12:00' }])) {
    throw new Error('isSlotWithinHours must accept a start inside the range');
  }
}

assertAvailabilityFixtures();
