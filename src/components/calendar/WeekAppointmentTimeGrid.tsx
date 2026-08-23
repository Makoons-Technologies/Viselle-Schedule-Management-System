import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Appointment } from '@/types/api';
import {
  buildWeekTimeSlots,
  currentTimeMinutes,
  formatMinutesLabel,
  groupAppointmentsByDay,
  layoutDayAppointments,
  minutesFromGridOffset,
  minutesToOffsetRem,
  nextAppointmentOnDay,
  firstAppointmentAfterDay,
  DEFAULT_DAY_START,
  SLOT_HEIGHT_REM,
  SLOT_MINUTES,
} from '@/components/calendar/week-time-grid';
import { buildWeekColumns, type WeekCalendarColumn } from '@/components/calendar/WeekCalendarTable';
import { Button } from '@/components/ui/button';
import { useSyncedHorizontalScroll } from '@/hooks/useSyncedHorizontalScroll';
import {
  findVerticalScroller,
  getScrollLeft,
  getScrollTop,
  scrollElementTo,
  setScrollLeft,
  setScrollTop,
} from '@/lib/scroll-helpers';
import { cn } from '@/lib/utils';

/** Native overflow-x so trackpad/touch keep compositor momentum (no JS physics). */
const CALENDAR_HSCROLL_CLASS =
  'overflow-x-auto overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch]';

/** Far-right hit strip for overlap cycle arrows (~32px; tall targets stay tappable). */
const STACK_RAIL_CLASS = 'w-8';

export type AppointmentStackMeta = {
  size: number;
  index: number;
  isFront: boolean;
};

interface WeekAppointmentTimeGridProps {
  days: Date[];
  appointments: Appointment[];
  renderAppointment: (
    appointment: Appointment,
    stack: AppointmentStackMeta | undefined,
    heightRem: number,
  ) => ReactNode;
  className?: string;
  /** Day keys (yyyy-MM-dd) highlighted for zoom selection. Ignored while zoomed. */
  selectedDayKeys?: string[];
  /** When set, only these days are shown (zoomed view). */
  zoomedDayKeys?: string[] | null;
  onDayHeaderSelect?: (dayKey: string, event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => void;
  onDayHeaderRangeSelect?: (dayKeys: string[]) => void;
  /** Double-click / double-tap shortcut to zoom into a day immediately. */
  onDayHeaderActivate?: (dayKey: string) => void;
  /** Click an empty time slot to create an appointment (date = day key yyyy-MM-dd). */
  onEmptySlotClick?: (slot: { dayKey: string; minutes: number }) => void;
  /** After creating, scroll this civil-time slot into view. */
  focusSlot?: { dayKey: string; minutes: number; nonce: number } | null;
  /** Sticks above the day headers while the calendar scrolls. */
  toolbar?: ReactNode;
}

export function WeekAppointmentTimeGrid({
  days,
  appointments,
  renderAppointment,
  className,
  selectedDayKeys = [],
  zoomedDayKeys = null,
  onDayHeaderSelect,
  onDayHeaderRangeSelect,
  onDayHeaderActivate,
  onEmptySlotClick,
  focusSlot = null,
  toolbar,
}: WeekAppointmentTimeGridProps) {
  const allColumns = buildWeekColumns(days);
  const isZoomed = !!zoomedDayKeys && zoomedDayKeys.length > 0;
  const zoomedKeySet = useMemo(
    () => (isZoomed ? new Set(zoomedDayKeys) : null),
    [isZoomed, zoomedDayKeys],
  );
  const columns = useMemo(
    () => (zoomedKeySet ? allColumns.filter((column) => zoomedKeySet.has(column.key)) : allColumns),
    [allColumns, zoomedKeySet],
  );
  const dayKeys = allColumns.map((column) => column.key);
  const selectedKeySet = useMemo(() => new Set(selectedDayKeys), [selectedDayKeys]);
  const includesToday = columns.some((column) => column.isToday);
  const [nowMinutes, setNowMinutes] = useState(currentTimeMinutes);

  useEffect(() => {
    if (!includesToday) return;
    const id = window.setInterval(() => setNowMinutes(currentTimeMinutes()), 30_000);
    return () => window.clearInterval(id);
  }, [includesToday]);

  const timeSlots = buildWeekTimeSlots(
    appointments,
    SLOT_MINUTES,
    includesToday ? [nowMinutes] : [],
  );
  const gridStartMinutes = timeSlots[0] ?? DEFAULT_DAY_START;
  const gridHeightRem = timeSlots.length * SLOT_HEIGHT_REM;
  const nowTopRem = minutesToOffsetRem(nowMinutes, gridStartMinutes);
  const showNowLine =
    includesToday &&
    nowMinutes >= gridStartMinutes &&
    nowMinutes <= gridStartMinutes + timeSlots.length * SLOT_MINUTES;
  const visibleDayKeys = columns.map((column) => column.key);
  const byDay = groupAppointmentsByDay(appointments, dayKeys);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const chromeRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const programmaticScrollRef = useRef(false);
  const [jumpCursor, setJumpCursor] = useState<{ dayKey: string; minutes: number } | null>(null);
  const [viewportMinutes, setViewportMinutes] = useState(gridStartMinutes - 1);
  const [navDayKey, setNavDayKey] = useState<string | null>(null);
  const originDayKey = columns.find((column) => column.isToday)?.key ?? visibleDayKeys[0];
  const activeDayKey = navDayKey && visibleDayKeys.includes(navDayKey) ? navDayKey : originDayKey;
  const jumpedOnActiveDay = Boolean(jumpCursor && jumpCursor.dayKey === activeDayKey);
  const afterMinutes =
    jumpedOnActiveDay && jumpCursor ? jumpCursor.minutes : viewportMinutes;
  const nextOnActiveDay = activeDayKey
    ? nextAppointmentOnDay(appointments, activeDayKey, afterMinutes, {
        // Viewport cursor is inclusive so a booking sitting at the top of the
        // visible grid (QA: today's 11:30) is not treated as already passed.
        // After a jump, stay exclusive so the same booking is not repeated.
        inclusive: !jumpedOnActiveDay,
      })
    : undefined;
  const nextDayTarget = activeDayKey
    ? firstAppointmentAfterDay(appointments, visibleDayKeys, activeDayKey)
    : undefined;
  const jumpDirection: 'down' | 'up' | null = nextOnActiveDay
    ? 'down'
    : nextDayTarget
      ? 'up'
      : null;
  const nextJumpTarget = nextOnActiveDay
    ? { dayKey: activeDayKey, minutes: nextOnActiveDay }
    : nextDayTarget;
  /** Which stack member is on top, keyed by overlap-group id. */
  const [stackFrontByKey, setStackFrontByKey] = useState<Record<string, number>>({});
  const dragRef = useRef<{
    pointerId: number;
    anchorKey: string;
    moved: boolean;
  } | null>(null);
  const headerRowRef = useRef<HTMLDivElement | null>(null);

  useSyncedHorizontalScroll(headerScrollRef, scrollRef);

  const mainScroller = () =>
    findVerticalScroller(bodyRef.current) ?? findVerticalScroller(scrollRef.current);

  useLayoutEffect(() => {
    if (focusSlot) return;
    if (!showNowLine) return;
    const body = bodyRef.current;
    const scroller = mainScroller();
    if (!body || !scroller) return;
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const bodyTop =
      body.getBoundingClientRect().top - scroller.getBoundingClientRect().top + getScrollTop(scroller);
    setScrollTop(scroller, bodyTop + nowTopRem * rem - scroller.clientHeight / 2);
  }, [showNowLine, dayKeys.join(','), focusSlot]);

  const scrollMainToMinutes = (minutes: number, align: 'center' | 'start') => {
    const body = bodyRef.current;
    const scroller = mainScroller();
    if (!body || !scroller) return;
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const chromeHeight = chromeRef.current?.offsetHeight ?? 0;
    const bodyTop =
      body.getBoundingClientRect().top - scroller.getBoundingClientRect().top + getScrollTop(scroller);
    const offsetRem = minutesToOffsetRem(minutes, gridStartMinutes);
    const top =
      align === 'center'
        ? bodyTop + offsetRem * rem - scroller.clientHeight / 2
        : bodyTop + offsetRem * rem - chromeHeight - 12;
    scrollElementTo(scroller, { top, behavior: align === 'start' ? 'smooth' : 'auto' });
  };

  /** Horizontal only — `scrollIntoView` on a full-height day column fights vertical jump. */
  const scrollDayColumnInline = (dayKey: string) => {
    const scroller = scrollRef.current;
    const header = headerScrollRef.current;
    const columnEl = bodyRef.current?.querySelector<HTMLElement>(`[data-day-column="${dayKey}"]`);
    if (!scroller || !columnEl) return;
    const gutter = bodyRef.current?.querySelector<HTMLElement>('.sticky.left-0');
    const gutterWidth = gutter?.getBoundingClientRect().width ?? 64;
    const delta = columnEl.getBoundingClientRect().left - (scroller.getBoundingClientRect().left + gutterWidth);
    const nextLeft = Math.max(0, getScrollLeft(scroller) + delta);
    setScrollLeft(scroller, nextLeft);
    setScrollLeft(header, nextLeft);
  };

  useLayoutEffect(() => {
    if (!focusSlot) return;
    scrollDayColumnInline(focusSlot.dayKey);
    scrollMainToMinutes(focusSlot.minutes, 'center');
  }, [focusSlot?.nonce, focusSlot?.dayKey, focusSlot?.minutes]);

  const readViewportMinutes = () => {
    const body = bodyRef.current;
    const scroller = mainScroller();
    if (!body || !scroller) return gridStartMinutes - 1;
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const chromeHeight = chromeRef.current?.offsetHeight ?? 0;
    const offsetPx = Math.max(
      0,
      scroller.getBoundingClientRect().top + chromeHeight - body.getBoundingClientRect().top,
    );
    return gridStartMinutes + (offsetPx / rem / SLOT_HEIGHT_REM) * SLOT_MINUTES;
  };

  const readLeadingDayKey = (): string | null => {
    const scroller = scrollRef.current;
    const body = bodyRef.current;
    if (!scroller || !body) return visibleDayKeys[0] ?? null;
    const gutter = body.querySelector<HTMLElement>('.sticky.left-0');
    const gutterWidth = gutter?.getBoundingClientRect().width ?? 64;
    const probeX = scroller.getBoundingClientRect().left + gutterWidth + 8;
    const columns = Array.from(body.querySelectorAll<HTMLElement>('[data-day-column]'));
    for (const el of columns) {
      const rect = el.getBoundingClientRect();
      if (probeX >= rect.left && probeX <= rect.right) {
        return el.dataset.dayColumn ?? null;
      }
    }
    let best: string | null = null;
    let bestDist = Infinity;
    for (const el of columns) {
      const rect = el.getBoundingClientRect();
      const dist = Math.min(Math.abs(rect.left - probeX), Math.abs(rect.right - probeX));
      if (dist < bestDist) {
        bestDist = dist;
        best = el.dataset.dayColumn ?? null;
      }
    }
    return best ?? visibleDayKeys[0] ?? null;
  };

  const beginProgrammaticScroll = () => {
    programmaticScrollRef.current = true;
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 600);
  };

  useEffect(() => {
    const vertical = mainScroller();
    const horizontal = scrollRef.current;
    if (!vertical) return;
    let dayResetTimer = 0;
    const onVerticalScroll = () => {
      setViewportMinutes(readViewportMinutes());
      if (programmaticScrollRef.current) return;
      setJumpCursor(null);
      window.clearTimeout(dayResetTimer);
      dayResetTimer = window.setTimeout(() => {
        setNavDayKey(readLeadingDayKey());
      }, 180);
    };
    const onHorizontalScroll = () => {
      if (programmaticScrollRef.current) return;
      setJumpCursor(null);
      window.clearTimeout(dayResetTimer);
      dayResetTimer = window.setTimeout(() => {
        setNavDayKey(readLeadingDayKey());
      }, 180);
    };
    vertical.addEventListener('scroll', onVerticalScroll, { passive: true });
    horizontal?.addEventListener('scroll', onHorizontalScroll, { passive: true });
    setViewportMinutes(readViewportMinutes());
    setNavDayKey(readLeadingDayKey());
    return () => {
      vertical.removeEventListener('scroll', onVerticalScroll);
      horizontal?.removeEventListener('scroll', onHorizontalScroll);
      window.clearTimeout(dayResetTimer);
    };
  }, [showNowLine, visibleDayKeys.join(',')]);

  const jumpToNextAppointment = () => {
    if (!nextJumpTarget) return;
    setJumpCursor(nextJumpTarget);
    setNavDayKey(nextJumpTarget.dayKey);
    beginProgrammaticScroll();
    scrollMainToMinutes(nextJumpTarget.minutes, 'start');
    scrollDayColumnInline(nextJumpTarget.dayKey);
  };

  const cycleStack = (stackKey: string, stackSize: number, delta: number) => {
    setStackFrontByKey((prev) => {
      const current = prev[stackKey] ?? 0;
      const next = (current + delta + stackSize) % stackSize;
      return { ...prev, [stackKey]: next };
    });
  };

  const keysBetween = (fromKey: string, toKey: string): string[] => {
    const fromIndex = dayKeys.indexOf(fromKey);
    const toIndex = dayKeys.indexOf(toKey);
    if (fromIndex < 0 || toIndex < 0) return [toKey];
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    return dayKeys.slice(start, end + 1);
  };

  const dayKeyFromClientX = (clientX: number): string | null => {
    const row = headerRowRef.current;
    if (!row) return null;
    const buttons = Array.from(row.querySelectorAll<HTMLElement>('[data-day-key]'));
    for (const el of buttons) {
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        return el.dataset.dayKey ?? null;
      }
    }
    return null;
  };

  const handleHeaderPointerDown = (columnKey: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (isZoomed || !onDayHeaderRangeSelect) return;
    if (event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, anchorKey: columnKey, moved: false };
    // Capture only for mouse range-select. Touch/pen capture cancels the
    // header pane's native horizontal fling.
    if (event.pointerType === 'mouse') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handleHeaderPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || isZoomed || !onDayHeaderRangeSelect) return;
    const overKey = dayKeyFromClientX(event.clientX);
    if (!overKey || overKey === drag.anchorKey) return;
    drag.moved = true;
    onDayHeaderRangeSelect(keysBetween(drag.anchorKey, overKey));
  };

  const handleHeaderPointerUp = (columnKey: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const moved = drag.moved;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (moved) return;
    onDayHeaderSelect?.(columnKey, {
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
    });
  };

  const columnMinWidthRem = isZoomed
    ? columns.length <= 1
      ? 18
      : columns.length <= 3
        ? 12
        : 9
    : 6;
  const gridMinWidthRem = 5 + columns.length * columnMinWidthRem;

  const headerRow = (
    <div
      ref={headerRowRef}
      className="flex border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800"
      style={{ minWidth: `${gridMinWidthRem}rem` }}
    >
      <div className="sticky left-0 z-20 w-16 shrink-0 border-r border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800 sm:w-20" />
      {columns.map((column) => (
        <DayHeader
          key={column.key}
          column={column}
          selectable={!isZoomed && !!onDayHeaderSelect}
          selected={!isZoomed && selectedKeySet.has(column.key)}
          onPointerDown={(event) => handleHeaderPointerDown(column.key, event)}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={(event) => handleHeaderPointerUp(column.key, event)}
          onDoubleClick={() => onDayHeaderActivate?.(column.key)}
        />
      ))}
    </div>
  );

  return (
    <>
    <div ref={chromeRef} className="sticky top-0 z-40 bg-stone-50 pt-2 dark:bg-stone-900">
      {toolbar ? <div className="mb-1.5">{toolbar}</div> : null}
      <div
        ref={headerScrollRef}
        className={cn(
          CALENDAR_HSCROLL_CLASS,
          'rounded-t-xl border border-b-0 border-stone-200 bg-white shadow-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden dark:border-stone-800 dark:bg-stone-900',
        )}
      >
        {headerRow}
      </div>
    </div>
    <div
      ref={scrollRef}
      className={cn(
        CALENDAR_HSCROLL_CLASS,
        'rounded-b-xl border border-t-0 border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900',
        className,
      )}
    >
      <div ref={bodyRef} className="relative flex" style={{ minWidth: `${gridMinWidthRem}rem` }}>
          {showNowLine && (
            <div
              className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
              style={{ top: `${nowTopRem}rem` }}
            >
              <span className="ml-12 h-2 w-2 shrink-0 rounded-full bg-rose-500 sm:ml-16" />
              <div className="h-0.5 flex-1 bg-rose-500" />
            </div>
          )}
          <div
            className="relative sticky left-0 z-10 w-16 shrink-0 border-r border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900 sm:w-20"
            style={{ height: `${gridHeightRem}rem` }}
          >
            {timeSlots.map((slotMinutes) => (
              <div
                key={slotMinutes}
                className="absolute right-0 w-16 pr-2 pt-0.5 text-right sm:w-20 sm:pr-3"
                style={{ top: `${minutesToOffsetRem(slotMinutes, gridStartMinutes)}rem` }}
              >
                <span className="block text-[10px] font-medium leading-none tabular-nums text-stone-500 dark:text-stone-400 sm:text-xs">
                  {formatMinutesLabel(slotMinutes)}
                </span>
              </div>
            ))}
          </div>

          {columns.map((column) => {
            const dayAppointments = byDay.get(column.key) ?? [];
            const positioned = layoutDayAppointments(
              dayAppointments,
              gridStartMinutes,
              SLOT_MINUTES,
              SLOT_HEIGHT_REM,
            );

            return (
              <DayColumn
                key={column.key}
                column={column}
                gridHeightRem={gridHeightRem}
                gridStartMinutes={gridStartMinutes}
                timeSlots={timeSlots}
                positioned={positioned}
                stackFrontByKey={stackFrontByKey}
                onCycleStack={cycleStack}
                renderAppointment={renderAppointment}
                onEmptySlotClick={onEmptySlotClick}
              />
            );
          })}
      </div>
    </div>
    {nextJumpTarget && jumpDirection && (
      <Button
        type="button"
        size="icon"
        className="fixed right-3 z-40 h-11 w-11 rounded-full shadow-lg bottom-[calc(5rem+var(--safe-area-bottom))] desktop-shell:bottom-6"
        aria-label={
          jumpDirection === 'up'
            ? "Go to next day's first appointment"
            : 'Scroll to next appointment'
        }
        title={jumpDirection === 'up' ? 'Next day' : 'Next appointment'}
        onClick={jumpToNextAppointment}
      >
        {jumpDirection === 'up' ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </Button>
    )}
    </>
  );
}

function DayColumn({
  column,
  gridHeightRem,
  gridStartMinutes,
  timeSlots,
  positioned,
  stackFrontByKey,
  onCycleStack,
  renderAppointment,
  onEmptySlotClick,
}: {
  column: WeekCalendarColumn;
  gridHeightRem: number;
  gridStartMinutes: number;
  timeSlots: number[];
  positioned: ReturnType<typeof layoutDayAppointments<Appointment>>;
  stackFrontByKey: Record<string, number>;
  onCycleStack: (stackKey: string, stackSize: number, delta: number) => void;
  renderAppointment: (
    appointment: Appointment,
    stack: AppointmentStackMeta | undefined,
    heightRem: number,
  ) => ReactNode;
  onEmptySlotClick?: (slot: { dayKey: string; minutes: number }) => void;
}) {
  return (
    <div
      data-day-column={column.key}
      className={cn(
        'relative min-w-0 flex-1 border-r border-stone-100 last:border-r-0 dark:border-stone-800',
        column.isToday && 'bg-brand-50/25 dark:bg-brand-900/20',
        onEmptySlotClick && 'cursor-pointer',
      )}
      style={{ height: `${gridHeightRem}rem` }}
      onClick={
        onEmptySlotClick
          ? (event) => {
              if ((event.target as HTMLElement).closest('[data-appointment-block]')) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const rem =
                Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
              onEmptySlotClick({
                dayKey: column.key,
                minutes: minutesFromGridOffset(
                  event.clientY - rect.top,
                  rem,
                  gridStartMinutes,
                  timeSlots.length,
                ),
              });
            }
          : undefined
      }
    >
      {timeSlots.map((slotMinutes) => (
        <div
          key={`${column.key}-line-${slotMinutes}`}
          className="pointer-events-none absolute inset-x-0 border-t border-stone-100 dark:border-stone-800"
          style={{ top: `${minutesToOffsetRem(slotMinutes, gridStartMinutes)}rem` }}
        />
      ))}

      {positioned.map(({ appointment, topRem, heightRem, stackKey, stackIndex, stackSize }) => {
        const frontIndex = stackKey ? (stackFrontByKey[stackKey] ?? 0) : 0;
        const isFront = stackSize <= 1 || stackIndex === frontIndex;
        const zIndex = isFront ? stackSize + 2 : stackIndex + 1;
        const hasStackControls = stackSize > 1 && isFront && !!stackKey;

        return (
          <div
            key={`${appointment.id}-${appointment.startTime}`}
            data-appointment-block
            className="absolute px-0.5 sm:px-1"
            style={{
              top: `${topRem}rem`,
              height: `${heightRem}rem`,
              left: 0,
              width: '100%',
              zIndex,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={cn(
                'relative h-full min-h-0',
                !isFront && 'ring-1 ring-stone-900/10 dark:ring-white/10',
              )}
            >
              {renderAppointment(
                appointment,
                stackSize > 1
                  ? { size: stackSize, index: stackIndex, isFront }
                  : undefined,
                heightRem,
              )}
              {hasStackControls ? (
                <StackEdgeControls
                  onPrevious={() => onCycleStack(stackKey, stackSize, -1)}
                  onNext={() => onCycleStack(stackKey, stackSize, 1)}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StackEdgeControls({
  onPrevious,
  onNext,
}: {
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-y-0 right-0 z-20 flex flex-col items-stretch',
        STACK_RAIL_CLASS,
      )}
      role="group"
      aria-label="Overlapping appointments"
    >
      <button
        type="button"
        className={cn(
          'pointer-events-auto flex min-h-0 flex-1 items-center justify-end pr-0.5',
          'text-stone-500 hover:text-stone-800',
          'dark:text-stone-400 dark:hover:text-stone-100',
        )}
        aria-label="Previous overlapping appointment"
        onClick={(event) => {
          event.stopPropagation();
          onPrevious();
        }}
      >
        <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className={cn(
          'pointer-events-auto flex min-h-0 flex-1 items-center justify-end pr-0.5',
          'text-stone-500 hover:text-stone-800',
          'dark:text-stone-400 dark:hover:text-stone-100',
        )}
        aria-label="Next overlapping appointment"
        onClick={(event) => {
          event.stopPropagation();
          onNext();
        }}
      >
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
    </div>
  );
}

function DayHeader({
  column,
  selectable,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
}: {
  column: WeekCalendarColumn;
  selectable: boolean;
  selected: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onDoubleClick: () => void;
}) {
  const content = (
    <>
      <span
        className={cn(
          'block text-[9px] font-semibold uppercase leading-none tracking-wider',
          column.isToday
            ? 'text-brand-700 dark:text-brand-200'
            : 'text-stone-600 dark:text-stone-300',
        )}
      >
        {column.dayLabel}
      </span>
      {column.dateLabel !== undefined && (
        <span
          className={cn(
            'mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
            column.isToday || selected
              ? 'bg-brand-600 text-white shadow-sm dark:bg-brand-500'
              : 'text-stone-900 dark:text-stone-100',
            selected &&
              'ring-2 ring-brand-300 ring-offset-1 ring-offset-stone-50 dark:ring-brand-400 dark:ring-offset-stone-800',
          )}
        >
          {column.dateLabel}
        </span>
      )}
    </>
  );

  const shellClass = cn(
    'min-w-0 flex-1 border-r border-stone-200 px-0.5 py-1 text-center last:border-r-0 dark:border-stone-700 sm:px-1',
    column.isToday && 'bg-brand-50 dark:bg-brand-900/55',
    selected && !column.isToday && 'bg-brand-50/70 dark:bg-brand-900/35',
  );

  if (!selectable) {
    return (
      <div className={shellClass} data-day-key={column.key}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-day-key={column.key}
      className={cn(
        shellClass,
        'touch-manipulation transition-colors select-none',
        'hover:bg-stone-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
        'dark:hover:bg-stone-700/50',
        selected && 'hover:bg-brand-50 dark:hover:bg-brand-900/45',
      )}
      aria-pressed={selected}
      aria-label={`Select ${column.dayLabel}${column.dateLabel ? ` ${column.dateLabel}` : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        onDoubleClick();
      }}
    >
      {content}
    </button>
  );
}
