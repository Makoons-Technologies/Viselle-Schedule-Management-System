/**
 * One-off verification for week calendar appointment geometry (no path aliases).
 * Run: npx --yes tsx scripts/verify-week-time-grid.ts
 */

const SLOT_MINUTES = 30;
const SLOT_HEIGHT_REM = 4;

function appointmentStartMinutes(iso: string): number {
  const start = new Date(iso);
  return start.getUTCHours() * 60 + start.getUTCMinutes();
}

function closestAvailableSlot<T extends { startTime: string }>(
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

function minutesToOffsetRem(minutes: number, gridStartMinutes: number): number {
  return ((minutes - gridStartMinutes) / SLOT_MINUTES) * SLOT_HEIGHT_REM;
}

function nextAppointmentOnDay(
  appointments: Array<{ startTime: string }>,
  dayKey: string,
  afterMinutes: number,
  options?: { inclusive?: boolean },
): number | undefined {
  const inclusive = options?.inclusive === true;
  let nextMinutes: number | undefined;
  for (const appointment of appointments) {
    if (appointment.startTime.slice(0, 10) !== dayKey) continue;
    const minutes = appointmentStartMinutes(appointment.startTime);
    if (inclusive ? minutes < afterMinutes : minutes <= afterMinutes) continue;
    if (nextMinutes === undefined || minutes < nextMinutes) nextMinutes = minutes;
  }
  return nextMinutes;
}

function firstAppointmentAfterDay(
  appointments: Array<{ startTime: string }>,
  dayKeys: string[],
  afterDayKey: string,
): { dayKey: string; minutes: number } | undefined {
  const startIndex = dayKeys.indexOf(afterDayKey);
  const from = startIndex < 0 ? 0 : startIndex + 1;
  for (let i = from; i < dayKeys.length; i += 1) {
    const minutes = nextAppointmentOnDay(appointments, dayKeys[i], -1);
    if (minutes !== undefined) {
      return { dayKey: dayKeys[i], minutes };
    }
  }
  return undefined;
}

function nextAppointmentInWeekOrder(
  appointments: Array<{ startTime: string }>,
  dayKeys: string[],
  after: { dayKey: string; minutes: number },
): { dayKey: string; minutes: number } | undefined {
  const sameDay = nextAppointmentOnDay(appointments, after.dayKey, after.minutes);
  if (sameDay !== undefined) {
    return { dayKey: after.dayKey, minutes: sameDay };
  }
  return firstAppointmentAfterDay(appointments, dayKeys, after.dayKey);
}

function buildWeekTimeSlots(
  appointments: Array<{ startTime: string; endTime?: string }> = [],
): number[] {
  const defaultStart = 0;
  const defaultEnd = 24 * 60;
  let min = defaultStart;
  let max = defaultEnd;
  for (const appointment of appointments) {
    const start = appointmentStartMinutes(appointment.startTime);
    const end = appointment.endTime ? appointmentStartMinutes(appointment.endTime) : start + SLOT_MINUTES;
    min = Math.min(min, start);
    max = Math.max(max, end);
  }
  min = Math.floor(min / SLOT_MINUTES) * SLOT_MINUTES;
  max = Math.ceil(max / SLOT_MINUTES) * SLOT_MINUTES;
  const slots: number[] = [];
  for (let time = min; time < max; time += SLOT_MINUTES) slots.push(time);
  return slots;
}

function minutesFromGridOffset(
  offsetPx: number,
  remPx: number,
  gridStartMinutes: number,
  slotCount: number,
): number {
  if (slotCount <= 0) return gridStartMinutes;
  const slotIndex = Math.min(
    slotCount - 1,
    Math.max(0, Math.floor(offsetPx / (SLOT_HEIGHT_REM * remPx))),
  );
  return gridStartMinutes + slotIndex * SLOT_MINUTES;
}

function appointmentBlockGeometry(startTime: string, endTime: string, gridStartMinutes: number) {
  const startMinutes = appointmentStartMinutes(startTime);
  const endMinutes = Math.max(startMinutes + 1, appointmentStartMinutes(endTime));
  const topRem = minutesToOffsetRem(startMinutes, gridStartMinutes);
  const heightRem = minutesToOffsetRem(endMinutes, gridStartMinutes) - topRem;
  return { topRem, heightRem, startMinutes, endMinutes };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

const gridStart = 8 * 60;
const geometry = appointmentBlockGeometry(
  '2026-07-22T09:45:00.000Z',
  '2026-07-22T10:15:00.000Z',
  gridStart,
);

const slot930Top = minutesToOffsetRem(9 * 60 + 30, gridStart);
const slot1000Top = minutesToOffsetRem(10 * 60, gridStart);
const expected945Top = (slot930Top + slot1000Top) / 2;

assert(
  geometry.topRem === expected945Top,
  `9:45 top (${geometry.topRem}) halfway between 9:30 (${slot930Top}) and 10:00 (${slot1000Top})`,
);
assert(
  geometry.heightRem === SLOT_HEIGHT_REM,
  `9:45–10:15 height (${geometry.heightRem}) equals one 30-min row (${SLOT_HEIGHT_REM})`,
);
assert(
  geometry.topRem === 3.5 * SLOT_HEIGHT_REM,
  `8:00 grid → 9:45 at 3.5 slots (${3.5 * SLOT_HEIGHT_REM}rem), got ${geometry.topRem}`,
);
assert(
  geometry.topRem !== 3 * SLOT_HEIGHT_REM,
  'must not snap 9:45 to the 9:30 row (old floor-to-slot bug)',
);

// Mirror of production helpers in week-time-grid.ts — keep values in sync
assert(
  appointmentStartMinutes('2026-07-22T09:45:00.000Z') === 585,
  '9:45 UTC wall clock → 585 minutes',
);

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function layoutDayAppointments(
  appointments: Array<{ id: string; startTime: string; endTime: string }>,
  gridStartMinutes: number,
) {
  const placed = appointments
    .map((appointment) => {
      const geometry = appointmentBlockGeometry(
        appointment.startTime,
        appointment.endTime,
        gridStartMinutes,
      );
      return { appointment, identity: appointment.id, ...geometry };
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

  return placed.map((item, index) => {
    const root = find(index);
    const members = clusters.get(root) ?? [index];
    const stackSize = members.length;
    const stackIndex = members.indexOf(index);
    return {
      id: item.appointment.id,
      topRem: item.topRem,
      heightRem: item.heightRem,
      stackSize,
      stackIndex,
      stackKey:
        stackSize > 1
          ? members
              .map((memberIndex) => placed[memberIndex].identity)
              .sort()
              .join('|')
          : '',
    };
  });
}

const stacked = layoutDayAppointments(
  [
    {
      id: 'a',
      startTime: '2026-07-22T09:00:00.000Z',
      endTime: '2026-07-22T10:00:00.000Z',
    },
    {
      id: 'b',
      startTime: '2026-07-22T09:30:00.000Z',
      endTime: '2026-07-22T10:30:00.000Z',
    },
    {
      id: 'c',
      startTime: '2026-07-22T11:00:00.000Z',
      endTime: '2026-07-22T11:30:00.000Z',
    },
  ],
  gridStart,
);

const a = stacked.find((item) => item.id === 'a')!;
const b = stacked.find((item) => item.id === 'b')!;
const c = stacked.find((item) => item.id === 'c')!;

assert(a.stackSize === 2 && b.stackSize === 2, 'partial overlap a/b share one stack of 2');
assert(a.stackKey === b.stackKey && a.stackKey !== '', 'overlapping peers share a stack key');
assert(c.stackSize === 1 && c.stackKey === '', 'non-overlapping c stays alone (full width)');
assert(
  a.topRem === minutesToOffsetRem(9 * 60, gridStart),
  `a keeps exact 9:00 top (${a.topRem})`,
);
assert(
  b.topRem === minutesToOffsetRem(9 * 60 + 30, gridStart),
  `b keeps exact 9:30 top (${b.topRem})`,
);
assert(a.heightRem === 2 * SLOT_HEIGHT_REM, 'a 9:00–10:00 is two slots tall');
assert(b.heightRem === 2 * SLOT_HEIGHT_REM, 'b 9:30–10:30 is two slots tall');

const remPx = 16;
assert(
  minutesFromGridOffset(0, remPx, gridStart, 20) === gridStart,
  'tap at top of column maps to first slot',
);
assert(
  minutesFromGridOffset(SLOT_HEIGHT_REM * remPx, remPx, gridStart, 20) === gridStart + SLOT_MINUTES,
  'tap one slot down maps to 8:30',
);
assert(
  minutesFromGridOffset(SLOT_HEIGHT_REM * remPx * 20, remPx, gridStart, 20) ===
    gridStart + 19 * SLOT_MINUTES,
  'tap past last slot clamps to last slot',
);

const jumpAppointments = [
  { startTime: '2026-08-24T09:00:00.000Z' },
  { startTime: '2026-08-24T14:00:00.000Z' },
  { startTime: '2026-08-25T08:30:00.000Z' },
];
const jumpDays = ['2026-08-24', '2026-08-25'];
assert(
  nextAppointmentInWeekOrder(jumpAppointments, jumpDays, { dayKey: '2026-08-24', minutes: 8 * 60 })?.minutes === 9 * 60,
  'next on the current day is the closest later booking (9:00)',
);
assert(
  nextAppointmentInWeekOrder(jumpAppointments, jumpDays, { dayKey: '2026-08-24', minutes: 9 * 60 })?.minutes === 14 * 60,
  'second tap on the same day continues later that day',
);
const nextDay = nextAppointmentInWeekOrder(jumpAppointments, jumpDays, {
  dayKey: '2026-08-24',
  minutes: 14 * 60,
});
assert(
  nextDay?.dayKey === '2026-08-25' && nextDay.minutes === 8 * 60 + 30,
  'after the last booking today, walk to the next day’s first appointment',
);
assert(
  nextAppointmentInWeekOrder(jumpAppointments, jumpDays, { dayKey: '2026-08-25', minutes: 8 * 60 + 30 }) === undefined,
  'no next appointment after the last day in order',
);

const defaultSlots = buildWeekTimeSlots([]);
assert(defaultSlots[0] === 0, 'empty week grid starts at 12:00 AM');
assert(defaultSlots.includes(12 * 60), 'empty week grid includes 12:00 PM');
assert(defaultSlots[defaultSlots.length - 1] === 23 * 60 + 30, 'empty week grid ends at 11:30 PM');
assert(
  nextAppointmentOnDay(jumpAppointments, '2026-08-24', 14 * 60) === undefined,
  'next-on-day does not walk to the following day',
);
const followingDay = firstAppointmentAfterDay(jumpAppointments, jumpDays, '2026-08-24');
assert(
  followingDay?.dayKey === '2026-08-25' && followingDay.minutes === 8 * 60 + 30,
  "end-of-day up control lands on the next day's first booking",
);

const nearestSlots = [
  { startTime: '2026-08-24T09:00:00.000Z' },
  { startTime: '2026-08-24T10:00:00.000Z' },
  { startTime: '2026-08-24T14:00:00.000Z' },
];
assert(
  closestAvailableSlot(nearestSlots, 9 * 60 + 20)?.startTime === '2026-08-24T09:00:00.000Z',
  'closest slot to 9:20 is 9:00',
);
assert(
  closestAvailableSlot(nearestSlots, 12 * 60)?.startTime === '2026-08-24T10:00:00.000Z',
  'closest slot to noon prefers the nearer morning time',
);
assert(closestAvailableSlot([], 10 * 60) === undefined, 'no slots → no closest pick');

assert(
  nextAppointmentOnDay(jumpAppointments, '2026-08-24', 11 * 60 + 30) === 14 * 60,
  'exclusive next after 11:30 skips that booking',
);
assert(
  nextAppointmentOnDay(jumpAppointments, '2026-08-24', 11 * 60 + 30, { inclusive: true }) === 14 * 60,
  'inclusive 11:30 with no 11:30 booking still finds 14:00',
);
const elevenThirtyDay = [
  ...jumpAppointments,
  { startTime: '2026-08-24T11:30:00.000Z' },
];
assert(
  nextAppointmentOnDay(elevenThirtyDay, '2026-08-24', 11 * 60 + 30) === 14 * 60,
  'exclusive viewport-aligned 11:30 would skip it (the QA bug)',
);
assert(
  nextAppointmentOnDay(elevenThirtyDay, '2026-08-24', 11 * 60 + 30, { inclusive: true }) === 11 * 60 + 30,
  'inclusive Down keeps the visible 11:30 at the viewport top',
);

if (process.exitCode) {
  console.error('\nVerification failed.');
} else {
  console.log('\nAll placement checks passed.');
}
