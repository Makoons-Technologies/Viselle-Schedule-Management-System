/** After creating from the calendar, keep the new booking on-screen. */

export function revealStaffAfterCreate(
  selectedIds: string[] | null,
  createdAccountId: string,
): string[] | null {
  if (selectedIds === null) return null;
  if (selectedIds.includes(createdAccountId)) return selectedIds;
  return [...selectedIds, createdAccountId];
}

export function shouldDisableMyAppointmentsOnly(params: {
  myAppointmentsOnly: boolean;
  myAccountId: string | null;
  createdAccountId: string;
}): boolean {
  return Boolean(
    params.myAppointmentsOnly &&
      params.myAccountId &&
      params.createdAccountId !== params.myAccountId,
  );
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
