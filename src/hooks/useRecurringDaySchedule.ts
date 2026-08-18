import { useQueries } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getDayTimeConflict,
  nextDateForDayOfWeek,
  resolveTimeForNewDay,
  slotStartTimes,
} from '@/components/appointments/recurring-day-times';
import { orgApi } from '@/lib/api';

interface UseRecurringDayScheduleOptions {
  orgId: string;
  accountId?: string;
  serviceId?: string;
  timezone: string;
  fallbackTime: string;
  enabled: boolean;
}

export function useRecurringDaySchedule({
  orgId,
  accountId,
  serviceId,
  timezone,
  fallbackTime,
  enabled,
}: UseRecurringDayScheduleOptions) {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayTimes, setDayTimes] = useState<Record<number, string>>({});
  const [lastSetTime, setLastSetTime] = useState<string | null>(null);
  const [userEditedDays, setUserEditedDays] = useState<Set<number>>(() => new Set());
  const fallbackTimeRef = useRef(fallbackTime);
  fallbackTimeRef.current = fallbackTime;

  const canValidate = enabled && !!accountId && !!serviceId;

  const resetSchedule = useCallback(
    (days: number[], times: Record<number, string>, lastTime?: string | null) => {
      setSelectedDays([...days].sort((a, b) => a - b));
      setDayTimes(times);
      setLastSetTime(lastTime ?? Object.values(times).at(-1) ?? fallbackTimeRef.current);
      setUserEditedDays(new Set());
    },
    [],
  );

  const slotQueries = useQueries({
    queries: selectedDays.map((day) => {
      const date = nextDateForDayOfWeek(day);
      return {
        queryKey: ['recurring-day-slots', orgId, accountId, serviceId, day, date],
        queryFn: () =>
          orgApi.getAccountAvailability(orgId, accountId!, {
            serviceId: serviceId!,
            startDate: date,
            endDate: date,
            timezone,
          }),
        enabled: canValidate,
        staleTime: 30_000,
      };
    }),
  });

  const availableTimesByDay = useMemo(() => {
    const map: Record<number, string[]> = {};
    selectedDays.forEach((day, index) => {
      map[day] = slotStartTimes(slotQueries[index]?.data?.availableSlots ?? []);
    });
    return map;
  }, [selectedDays, slotQueries]);

  const toggleDay = useCallback(
    (day: number) => {
      if (selectedDays.includes(day)) {
        if (selectedDays.length === 1) return;
        const nextDays = selectedDays.filter((value) => value !== day);
        const { [day]: _removed, ...restTimes } = dayTimes;
        setSelectedDays(nextDays);
        setDayTimes(restTimes);
        return;
      }

      const candidate = lastSetTime ?? fallbackTime;
      const resolvedTime = resolveTimeForNewDay(candidate, availableTimesByDay[day]);
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
      setDayTimes({ ...dayTimes, [day]: resolvedTime });
      setLastSetTime(resolvedTime);
    },
    [availableTimesByDay, dayTimes, fallbackTime, lastSetTime, selectedDays],
  );

  const slotsLoading = canValidate && slotQueries.some((query) => query.isLoading);

  const setDayTime = useCallback((day: number, time: string) => {
    setDayTimes((current) => ({ ...current, [day]: time }));
    setLastSetTime(time);
    setUserEditedDays((current) => new Set(current).add(day));
  }, []);

  useEffect(() => {
    if (!canValidate || slotsLoading) return;

    setDayTimes((current) => {
      let changed = false;
      const next = { ...current };

      for (const day of selectedDays) {
        if (userEditedDays.has(day)) continue;

        const available = availableTimesByDay[day];
        if (!available || available.length === 0) continue;

        const time = next[day];
        if (!time || available.includes(time)) continue;

        const resolved = resolveTimeForNewDay(lastSetTime ?? fallbackTime, available);
        if (resolved !== time) {
          next[day] = resolved;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [
    availableTimesByDay,
    canValidate,
    fallbackTime,
    lastSetTime,
    selectedDays,
    slotsLoading,
    userEditedDays,
  ]);

  const dayConflicts = useMemo(() => {
    const conflicts: Record<number, string | undefined> = {};
    for (const day of selectedDays) {
      const index = selectedDays.indexOf(day);
      conflicts[day] = getDayTimeConflict(dayTimes[day], availableTimesByDay[day], {
        canValidate,
        loading: slotQueries[index]?.isLoading,
      });
    }
    return conflicts;
  }, [availableTimesByDay, canValidate, dayTimes, selectedDays, slotQueries]);

  const hasConflicts = Object.values(dayConflicts).some(Boolean);

  return {
    selectedDays,
    dayTimes,
    lastSetTime,
    resetSchedule,
    toggleDay,
    setDayTime,
    dayConflicts,
    hasConflicts,
    slotsLoading,
    availableTimesByDay,
  };
}
