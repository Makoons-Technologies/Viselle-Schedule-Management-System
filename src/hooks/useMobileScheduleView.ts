import { useCallback, useState } from 'react';

/**
 * Mobile calendar schedule scope. Stored as one of:
 *  - `'all'` — every schedule
 *  - `'me'`  — the signed-in user's own account (resolved to their account id)
 *  - an account id — a specific other staff member
 * Kept symbolic (`'me'`) rather than a concrete id so the "me" default survives
 * account/org switches.
 */
export const ALL_SCHEDULES = 'all';
export const MY_SCHEDULE = 'me';

const STORAGE_KEY = 'viselle.calendar.mobileScheduleView';

function readStoredView(): string {
  return localStorage.getItem(STORAGE_KEY) ?? MY_SCHEDULE;
}

export function useMobileScheduleView() {
  const [scheduleView, setScheduleViewState] = useState<string>(readStoredView);

  const setScheduleView = useCallback((value: string) => {
    setScheduleViewState(value);
    localStorage.setItem(STORAGE_KEY, value);
  }, []);

  return { scheduleView, setScheduleView };
}
