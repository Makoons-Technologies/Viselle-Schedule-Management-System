import type { ReactNode } from 'react';
import type { Appointment } from '@/types/api';
import {
  buildWeekTimeSlots,
  formatMinutesLabel,
  groupAppointmentsByDayAndSlot,
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
  const grouped = groupAppointmentsByDayAndSlot(appointments, dayKeys, SLOT_MINUTES);

  return (
    <div
      className={cn(
        'overflow-x-auto shadow-sm',
        panelClassName,
        className,
      )}
    >
      <table className="w-full min-w-[44rem] table-fixed border-collapse">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50/90 dark:border-stone-700 dark:bg-stone-800/80">
            <th
              scope="col"
              className="sticky left-0 z-20 w-16 border-r border-stone-200 bg-stone-50/95 px-2 py-3 dark:border-stone-700 dark:bg-stone-800/95 sm:w-20"
            />
            {columns.map((column) => (
              <DayHeader key={column.key} column={column} />
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slotMinutes) => {
            const rowCounts = columns.map(
              (column) => grouped.get(`${column.key}:${slotMinutes}`)?.length ?? 0,
            );
            const maxInRow = Math.max(1, ...rowCounts);

            return (
            <tr key={slotMinutes} className="border-b border-stone-100 last:border-b-0 dark:border-stone-800">
              <th
                scope="row"
                className="sticky left-0 z-10 border-r border-stone-200 bg-white px-2 py-0 text-right align-top dark:border-stone-700 dark:bg-stone-900 sm:px-3"
              >
                <span className="block py-2 text-[10px] font-medium tabular-nums text-stone-500 dark:text-stone-400 sm:text-xs">
                  {formatMinutesLabel(slotMinutes)}
                </span>
              </th>
              {columns.map((column) => {
                const cellAppointments = grouped.get(`${column.key}:${slotMinutes}`) ?? [];
                return (
                  <td
                    key={`${column.key}-${slotMinutes}`}
                    className={cn(
                      'border-r border-stone-100 align-top p-0.5 last:border-r-0 dark:border-stone-800 sm:p-1',
                      column.isToday && 'bg-brand-50/25 dark:bg-brand-900/20',
                    )}
                    style={{ minHeight: `${maxInRow * 3.25 + 0.25}rem` }}
                  >
                    <div className="flex flex-col gap-0.5">
                      {cellAppointments.map((appointment) => (
                        <div key={`${appointment.id}-${appointment.startTime}`}>{renderAppointment(appointment)}</div>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DayHeader({ column }: { column: WeekCalendarColumn }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-r border-stone-200 px-2 py-3 text-center last:border-r-0 dark:border-stone-700',
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
    </th>
  );
}
