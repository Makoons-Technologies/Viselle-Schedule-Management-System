/** Deep link from dashboard (and elsewhere) into the org calendar. */

/**
 * Query strings treat `+` as a space, so `2026-08-31T21:18:00+00:00` becomes
 * an invalid timestamp. Restore the offset and prefer a Z-form instant.
 */
export function normalizeCalendarInstant(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const restored = iso.trim().replace(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?) (\d{2}:\d{2})$/,
    '$1+$2',
  );
  const parsed = new Date(restored);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function calendarAppointmentHref(
  orgId: string,
  appointment: { id: string; startTime: string },
): string {
  const params = new URLSearchParams({ appointment: appointment.id });
  const at = normalizeCalendarInstant(appointment.startTime);
  if (at) params.set('at', at);
  return `/orgs/${orgId}/calendar?${params.toString()}`;
}

export function parseCalendarAppointmentSearch(search: URLSearchParams): {
  id: string;
  startTime: string | null;
} | null {
  const id = search.get('appointment')?.trim();
  if (!id) return null;
  return { id, startTime: normalizeCalendarInstant(search.get('at')) };
}
