/**
 * One-off verification for week calendar appointment geometry (no path aliases).
 * Run: npx --yes tsx scripts/verify-week-time-grid.ts
 */

const SLOT_MINUTES = 30;
const SLOT_HEIGHT_REM = 3;

function appointmentStartMinutes(iso: string): number {
  const start = new Date(iso);
  return start.getUTCHours() * 60 + start.getUTCMinutes();
}

function minutesToOffsetRem(minutes: number, gridStartMinutes: number): number {
  return ((minutes - gridStartMinutes) / SLOT_MINUTES) * SLOT_HEIGHT_REM;
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

if (process.exitCode) {
  console.error('\nVerification failed.');
} else {
  console.log('\nAll placement checks passed.');
}
