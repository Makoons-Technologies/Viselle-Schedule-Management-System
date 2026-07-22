import type { ReactNode } from 'react';
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
              <div
                key={column.key}
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

                {positioned.map(({ appointment, topRem, heightRem, lane, laneCount }) => (
                  <div
                    key={`${appointment.id}-${appointment.startTime}`}
                    className="absolute z-[1] px-0.5 sm:px-1"
                    style={{
                      top: `${topRem}rem`,
                      height: `${heightRem}rem`,
                      left: `${(lane / laneCount) * 100}%`,
                      width: `${(1 / laneCount) * 100}%`,
                    }}
                  >
                    {renderAppointment(appointment)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
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
