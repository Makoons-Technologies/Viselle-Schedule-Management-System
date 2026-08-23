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

function minutesToOffsetRem(minutes: number, gridStartMinutes: number): number {
  return ((minutes - gridStartMinutes) / SLOT_MINUTES) * SLOT_HEIGHT_REM;
}

function nextAppointmentInWeekOrder(
  appointments: Array<{ startTime: string }>,
  dayKeys: string[],
  after: { dayKey: string; minutes: number },
): { dayKey: string; minutes: number } | undefined {
  const startIndex = Math.max(0, dayKeys.indexOf(after.dayKey));

  for (let dayIndex = startIndex; dayIndex < dayKeys.length; dayIndex += 1) {
    const dayKey = dayKeys[dayIndex];
    const minMinutes = dayIndex === startIndex && dayKeys[startIndex] === after.dayKey
      ? after.minutes
      : -1;
    let nextMinutes: number | undefined;
    for (const appointment of appointments) {
      if (appointment.startTime.slice(0, 10) !== dayKey) continue;
      const minutes = appointmentStartMinutes(appointment.startTime);
      if (minutes <= minMinutes) continue;
      if (nextMinutes === undefined || minutes < nextMinutes) nextMinutes = minutes;
    }
    if (nextMinutes !== undefined) {
      return { dayKey, minutes: nextMinutes };
    }
  }

  return undefined;
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

if (process.exitCode) {
  console.error('\nVerification failed.');
} else {
  console.log('\nAll placement checks passed.');
}
