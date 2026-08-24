/** Deep link from dashboard (and elsewhere) into the org calendar. */

export function calendarAppointmentHref(
  orgId: string,
  appointment: { id: string; startTime: string },
): string {
  const params = new URLSearchParams({
    appointment: appointment.id,
    at: appointment.startTime,
  });
  return `/orgs/${orgId}/calendar?${params.toString()}`;
}

export function parseCalendarAppointmentSearch(search: URLSearchParams): {
  id: string;
  startTime: string | null;
} | null {
  const id = search.get('appointment')?.trim();
  if (!id) return null;
  const at = search.get('at')?.trim();
  return { id, startTime: at || null };
}
