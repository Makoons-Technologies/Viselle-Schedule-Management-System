/**
 * BEA-90: calendar drag/resize session cleanup + duration clamps.
 * Run: npx --yes tsx scripts/verify-calendar-dnd.ts
 */

import {
  appointmentDurationMinutes,
  clampBlockToGrid,
  clampMoveStart,
  clampResizeEnd,
  DAY_END_MINUTES,
  minutesFromPointerDelta,
  minutesToIsoOnDay,
  resolveDisplayEndMinutes,
  SNAP_MINUTES,
} from '../src/lib/calendar-dnd.ts';
import {
  attachCalendarDragListeners,
  shouldCommitCalendarDrag,
  type CalendarDragEndReason,
} from '../src/lib/calendar-drag-session.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

class MockHost {
  listeners = new Map<string, Set<(event: Event) => void>>();

  addEventListener(type: string, listener: (event: Event) => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: Event) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, event: Event) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener(event);
    }
  }

  listenerCount(type: string) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

function fakePointer(pointerId: number, extra: Record<string, unknown> = {}): Event {
  return { pointerId, ...extra } as unknown as Event;
}

assert(clampResizeEnd(9 * 60, 9 * 60 + 5) === 9 * 60 + SNAP_MINUTES, 'resize snaps up to the 15-minute minimum');
assert(clampResizeEnd(9 * 60, 30 * 60) === DAY_END_MINUTES, 'resize cannot extend past midnight');
assert(clampMoveStart(20 * 60, 8 * 60) === 16 * 60, 'move keeps an 8-hour block inside the civil day');
assert(clampMoveStart(10 * 60, 3 * 24 * 60) === 0, 'huge saved duration cannot push a move off the grid');

assert(
  minutesToIsoOnDay('2026-09-16', 9 * 60 + 15) === '2026-09-16T09:15:00.000Z',
  'minutesToIsoOnDay encodes wall clock in UTC fields',
);
assert(
  minutesToIsoOnDay('2026-09-16', DAY_END_MINUTES) === '2026-09-17T00:00:00.000Z',
  'exclusive midnight is the next civil day at 00:00',
);

assert(
  appointmentDurationMinutes('2026-09-16T09:00:00.000Z', '2026-09-16T10:00:00.000Z') === 60,
  'same-day duration uses clock minutes',
);
assert(
  appointmentDurationMinutes('2026-09-16T09:00:00.000Z', '2026-09-17T00:00:00.000Z') === 15 * 60,
  '09:00 → next midnight is 15 hours, not a 1-minute wrap',
);

assert(
  resolveDisplayEndMinutes('2026-09-16T09:00:00.000Z', '2026-09-16T10:30:00.000Z') === 10 * 60 + 30,
  'same-day end stays the clock end',
);
assert(
  resolveDisplayEndMinutes('2026-09-16T09:00:00.000Z', '2026-09-17T00:00:00.000Z') === DAY_END_MINUTES,
  'next-day midnight displays as end of the start day',
);
assert(
  resolveDisplayEndMinutes('2026-09-16T09:00:00.000Z', '2026-09-18T09:00:00.000Z') === DAY_END_MINUTES,
  'multi-day duration is clamped to midnight so the block cannot cover later days',
);

const clamped = clampBlockToGrid(9 * 60, 30 * 60, 0);
assert(clamped.endMinutes === DAY_END_MINUTES, 'block end is clamped to the painted grid');
assert(clamped.startMinutes === 9 * 60, 'block start is unchanged when already on-grid');

const overflow = clampBlockToGrid(-60, 48 * 60, 0);
assert(overflow.startMinutes === 0 && overflow.endMinutes === DAY_END_MINUTES, 'off-grid geometry is boxed to the column');

assert(
  Math.round(minutesFromPointerDelta(64, 16, 4, 30)) === 30,
  '64px at 16px rem / 4rem slot = 30 minutes',
);
assert(minutesFromPointerDelta(8, 16, 4, 30) < SNAP_MINUTES, 'a short handle drag is not a full-day jump');

assert(shouldCommitCalendarDrag('pointerup', true) === true, 'pointerup after a real move commits');
assert(shouldCommitCalendarDrag('pointerup', false) === false, 'click without move does not save');
assert(shouldCommitCalendarDrag('escape', true) === false, 'Escape discards an in-progress resize');
assert(shouldCommitCalendarDrag('blur', true) === false, 'window blur discards an in-progress resize');
assert(shouldCommitCalendarDrag('pointercancel', true) === false, 'pointercancel does not save');
assert(shouldCommitCalendarDrag('unmount', true) === false, 'unmount does not save');
assert(shouldCommitCalendarDrag('visibility', true) === false, 'hidden tab does not save');

for (const reason of ['pointerup', 'pointercancel', 'blur', 'escape', 'visibility'] as const) {
  const host = new MockHost();
  const ended: CalendarDragEndReason[] = [];
  attachCalendarDragListeners(host, {
    pointerId: 7,
    onEnd: (next) => ended.push(next),
  });

  if (reason === 'pointerup' || reason === 'pointercancel') {
    host.dispatch(reason, fakePointer(7));
  } else if (reason === 'escape') {
    host.dispatch('keydown', { key: 'Escape' } as unknown as Event);
  } else if (reason === 'visibility') {
    host.dispatch('visibilitychange', { target: { visibilityState: 'hidden' } } as unknown as Event);
  } else {
    host.dispatch('blur', {} as Event);
  }

  assert(ended[0] === reason, `session ends on ${reason}`);
  assert(
    host.listenerCount('pointerup') === 0 && host.listenerCount('pointermove') === 0,
    `${reason} removes every drag listener`,
  );
}

{
  const host = new MockHost();
  const ended: CalendarDragEndReason[] = [];
  const detach = attachCalendarDragListeners(host, {
    pointerId: 3,
    onEnd: (reason) => ended.push(reason),
  });
  host.dispatch('pointerup', fakePointer(99));
  assert(ended.length === 0, 'pointerup from another pointer does not steal the session');
  detach();
  assert(host.listenerCount('pointerup') === 0, 'manual detach removes listeners without a second end');
  assert(ended.length === 0, 'silent detach does not emit unmount (caller owns that reason)');
}

{
  const host = new MockHost();
  const ended: CalendarDragEndReason[] = [];
  attachCalendarDragListeners(host, {
    pointerId: 1,
    onEnd: (reason) => ended.push(reason),
  });
  host.dispatch('pointerup', fakePointer(1));
  host.dispatch('escape', { key: 'Escape' } as unknown as Event);
  host.dispatch('blur', {} as Event);
  assert(ended.length === 1, 'after pointerup, later blur/escape cannot re-enter drag');
}

if (process.exitCode) {
  console.error('\nCalendar drag verification failed.');
} else {
  console.log('\nCalendar drag verification passed.');
}
