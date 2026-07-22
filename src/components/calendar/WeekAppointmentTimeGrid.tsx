import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '@/types/api';
import {
  buildWeekTimeSlots,
  formatMinutesLabel,
  groupAppointmentsByDay,
  layoutDayAppointments,
  minutesToOffsetRem,
  SLOT_HEIGHT_REM,
  SLOT_MINUTES,
} from '@/components/calendar/week-time-grid';
import { buildWeekColumns, type WeekCalendarColumn } from '@/components/calendar/WeekCalendarTable';
import { panelClassName } from '@/components/common/Panel';
import { cn } from '@/lib/utils';

/** Reserved strip above stacked chips so the pager never covers title/service text. */
const STACK_PAGER_RESERVE_REM = 1.125;

interface WeekAppointmentTimeGridProps {
  days: Date[];
  appointments: Appointment[];
  renderAppointment: (appointment: Appointment) => ReactNode;
  className?: string;
}

export function WeekAppointmentTimeGrid({
  days,
  appointments,
  renderAppointment,
  className,
}: WeekAppointmentTimeGridProps) {
  const columns = buildWeekColumns(days);
  const dayKeys = columns.map((column) => column.key);
  const timeSlots = buildWeekTimeSlots(appointments, SLOT_MINUTES);
  const gridStartMinutes = timeSlots[0] ?? 8 * 60;
  const gridHeightRem = timeSlots.length * SLOT_HEIGHT_REM;
  const byDay = groupAppointmentsByDay(appointments, dayKeys);
  /** Which stack member is on top, keyed by overlap-group id. */
  const [stackFrontByKey, setStackFrontByKey] = useState<Record<string, number>>({});

  const cycleStack = (stackKey: string, stackSize: number, delta: number) => {
    setStackFrontByKey((prev) => {
      const current = prev[stackKey] ?? 0;
      const next = (current + delta + stackSize) % stackSize;
      return { ...prev, [stackKey]: next };
    });
  };

  return (
    <div
      className={cn(
        'overflow-x-auto shadow-sm',
        panelClassName,
        className,
      )}
    >
      <div className="min-w-[44rem]">
        <div className="flex border-b border-stone-200 bg-stone-50/90 dark:border-stone-700 dark:bg-stone-800/80">
          <div className="sticky left-0 z-20 w-16 shrink-0 border-r border-stone-200 bg-stone-50/95 dark:border-stone-700 dark:bg-stone-800/95 sm:w-20" />
          {columns.map((column) => (
            <DayHeader key={column.key} column={column} />
          ))}
        </div>

        <div className="flex">
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
              />
            );
          })}
        </div>
      </div>
    </div>
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
}: {
  column: WeekCalendarColumn;
  gridHeightRem: number;
  gridStartMinutes: number;
  timeSlots: number[];
  positioned: ReturnType<typeof layoutDayAppointments<Appointment>>;
  stackFrontByKey: Record<string, number>;
  onCycleStack: (stackKey: string, stackSize: number, delta: number) => void;
  renderAppointment: (appointment: Appointment) => ReactNode;
}) {
  const stackPagerAnchor = useMemo(() => {
    const anchors = new Map<string, { topRem: number; heightRem: number }>();
    for (const item of positioned) {
      if (item.stackSize <= 1 || !item.stackKey) continue;
      const existing = anchors.get(item.stackKey);
      if (!existing) {
        anchors.set(item.stackKey, { topRem: item.topRem, heightRem: item.heightRem });
        continue;
      }
      const topRem = Math.min(existing.topRem, item.topRem);
      const bottomRem = Math.max(
        existing.topRem + existing.heightRem,
        item.topRem + item.heightRem,
      );
      anchors.set(item.stackKey, { topRem, heightRem: bottomRem - topRem });
    }
    return anchors;
  }, [positioned]);

  return (
    <div
      className={cn(
        'relative min-w-0 flex-1 border-r border-stone-100 last:border-r-0 dark:border-stone-800',
        column.isToday && 'bg-brand-50/25 dark:bg-brand-900/20',
      )}
      style={{ height: `${gridHeightRem}rem` }}
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
        const hasStackPager = stackSize > 1;

        return (
          <div
            key={`${appointment.id}-${appointment.startTime}`}
            className="absolute px-0.5 sm:px-1"
            style={{
              top: `${topRem}rem`,
              height: `${heightRem}rem`,
              left: 0,
              width: '100%',
              zIndex,
            }}
          >
            <div
              className="box-border h-full"
              style={
                hasStackPager
                  ? { paddingTop: `${STACK_PAGER_RESERVE_REM}rem` }
                  : undefined
              }
            >
              <div
                className={cn(
                  'h-full min-h-0',
                  !isFront && 'ring-1 ring-stone-900/10 dark:ring-white/10',
                )}
              >
                {renderAppointment(appointment)}
              </div>
            </div>
          </div>
        );
      })}

      {[...stackPagerAnchor.entries()].map(([stackKey, anchor]) => {
        const stackSize =
          positioned.find((item) => item.stackKey === stackKey)?.stackSize ?? 1;
        const frontIndex = stackFrontByKey[stackKey] ?? 0;

        return (
          <StackPager
            key={`pager-${stackKey}`}
            topRem={anchor.topRem}
            label={`${frontIndex + 1}/${stackSize}`}
            onPrevious={() => onCycleStack(stackKey, stackSize, -1)}
            onNext={() => onCycleStack(stackKey, stackSize, 1)}
          />
        );
      })}
    </div>
  );
}

function StackPager({
  topRem,
  label,
  onPrevious,
  onNext,
}: {
  topRem: number;
  label: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30 flex items-center justify-end px-1.5 sm:px-2"
      style={{
        top: `${topRem}rem`,
        height: `${STACK_PAGER_RESERVE_REM}rem`,
      }}
    >
      <div
        className="pointer-events-auto inline-flex h-4 items-center gap-px rounded border border-stone-600/70 bg-stone-800/85 px-0.5 text-stone-200 shadow-sm backdrop-blur-[2px] dark:border-stone-500/60 dark:bg-stone-900/80"
        role="group"
        aria-label={`Overlapping appointments ${label}`}
      >
        <button
          type="button"
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-stone-300 hover:bg-white/10 hover:text-stone-50"
          aria-label="Previous overlapping appointment"
          onClick={(event) => {
            event.stopPropagation();
            onPrevious();
          }}
        >
          <ChevronLeft className="h-3 w-3" strokeWidth={2.25} />
        </button>
        <span className="min-w-[1.5rem] px-0.5 text-center text-[9px] font-medium tabular-nums leading-none text-stone-200">
          {label}
        </span>
        <button
          type="button"
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-stone-300 hover:bg-white/10 hover:text-stone-50"
          aria-label="Next overlapping appointment"
          onClick={(event) => {
            event.stopPropagation();
            onNext();
          }}
        >
          <ChevronRight className="h-3 w-3" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}

function DayHeader({ column }: { column: WeekCalendarColumn }) {
  return (
    <div
      className={cn(
        'min-w-0 flex-1 border-r border-stone-200 px-2 py-3 text-center last:border-r-0 dark:border-stone-700',
        column.isToday && 'bg-brand-50 dark:bg-brand-900/55',
      )}
    >
      <span
        className={cn(
          'block text-[10px] font-semibold uppercase tracking-wider',
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
            'mt-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums sm:h-8 sm:w-8 sm:text-sm',
            column.isToday
              ? 'bg-brand-600 text-white shadow-sm dark:bg-brand-500'
              : 'text-stone-900 dark:text-stone-100',
          )}
        >
          {column.dateLabel}
        </span>
      )}
    </div>
  );
}
