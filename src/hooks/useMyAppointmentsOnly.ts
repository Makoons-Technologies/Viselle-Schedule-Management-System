import { useCallback, useState } from 'react';

const STORAGE_KEY = 'viselle.calendar.myAppointmentsOnly';

function readStoredPreference(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

export function useMyAppointmentsOnly() {
  const [myAppointmentsOnly, setMyAppointmentsOnlyState] = useState(readStoredPreference);

  const setMyAppointmentsOnly = useCallback((value: boolean) => {
    setMyAppointmentsOnlyState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  return { myAppointmentsOnly, setMyAppointmentsOnly };
}
