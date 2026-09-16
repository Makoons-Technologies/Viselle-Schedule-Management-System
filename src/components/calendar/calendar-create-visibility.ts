/** After creating from the calendar, keep the new booking on-screen. */

export function revealStaffAfterCreate(
  selectedIds: string[] | null,
  createdAccountId: string,
  meAccountId?: string | null,
): string[] | null {
  if (selectedIds === null) {
    // null is the implicit first-load default (me only). Stay implicit when the
    // new booking is already mine; otherwise materialize me + the created staff.
    if (!meAccountId || meAccountId === createdAccountId) return null;
    return [meAccountId, createdAccountId];
  }
  if (selectedIds.includes(createdAccountId)) return selectedIds;
  return [...selectedIds, createdAccountId];
}

/**
 * On mobile the calendar can be scoped to a single person (me or another staff
 * member). If you book someone else while scoped, widen the view to "all" so the
 * newly created appointment stays visible.
 */
export function shouldRevealAllAfterCreate(params: {
  viewedAccountId: string | null;
  createdAccountId: string;
}): boolean {
  return Boolean(params.viewedAccountId && params.createdAccountId !== params.viewedAccountId);
}

export function shouldClearDayZoom(
  zoomedDayKeys: string[] | null | undefined,
  createdDayKey: string,
): boolean {
  if (!zoomedDayKeys || zoomedDayKeys.length === 0) return false;
  return !zoomedDayKeys.includes(createdDayKey);
}

/** Parse a `yyyy-MM-dd` column key as a local calendar date (not UTC midnight). */
export function localDateFromDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}
