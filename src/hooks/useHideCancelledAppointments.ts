import { useCallback, useState } from 'react';

const STORAGE_KEY = 'viselle.hideCancelledAppointments';

function readStoredPreference(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

export function useHideCancelledAppointments() {
  const [hideCancelled, setHideCancelledState] = useState(readStoredPreference);

  const setHideCancelled = useCallback((value: boolean) => {
    setHideCancelledState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  return { hideCancelled, setHideCancelled };
}

export function filterOutCancelled<T extends { visitStatus: string }>(
  items: T[],
  hideCancelled: boolean,
): T[] {
  if (!hideCancelled) return items;
  return items.filter((item) => item.visitStatus !== 'cancelled');
}
