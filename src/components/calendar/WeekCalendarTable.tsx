import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { AVAILABILITY_DAYS } from '@/lib/availability';
import { panelClassName } from '@/components/common/Panel';
import { cn } from '@/lib/utils';

export interface WeekCalendarColumn {
  key: string;
  dayLabel: string;
  dateLabel?: string;
  isToday?: boolean;
}

interface WeekCalendarTableProps {
  columns: WeekCalendarColumn[];
  renderCell: (column: WeekCalendarColumn, index: number) => ReactNode;
  className?: string;
  cellClassName?: string;
}

const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildWeekColumns(days: Date[]): WeekCalendarColumn[] {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  return days.map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    return {
      key,
      dayLabel: format(day, 'EEE'),
      dateLabel: format(day, 'd'),
      isToday: key === todayKey,
    };
  });
}

export function buildDayOfWeekColumns(): WeekCalendarColumn[] {
  return AVAILABILITY_DAYS.map((dayOfWeek) => ({
    key: String(dayOfWeek),
    dayLabel: WEEKDAY_ABBR[dayOfWeek],
  }));
}

export function WeekCalendarTable({
  columns,
  renderCell,
  className,
  cellClassName,
}: WeekCalendarTableProps) {
  return (
    <div
      className={cn(
        'overflow-x-auto shadow-sm',
        panelClassName,
        className,
      )}
    >
      <table className="w-full min-w-[42rem] table-fixed border-collapse">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50/90 dark:border-stone-700 dark:bg-stone-800/80">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'w-[14.28%] border-r border-stone-200 px-2 py-3 text-center last:border-r-0 dark:border-stone-700',
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
                      'mt-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                      column.isToday
                        ? 'bg-brand-600 text-white shadow-sm dark:bg-brand-500'
                        : 'text-stone-900 dark:text-stone-100',
                    )}
                  >
                    {column.dateLabel}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.map((column, index) => (
              <td
                key={column.key}
                className={cn(
                  'min-h-[14rem] border-r border-t border-stone-100 align-top p-2 last:border-r-0 dark:border-stone-800 sm:min-h-[16rem] sm:p-3',
                  column.isToday && 'bg-brand-50/30 dark:bg-brand-900/25',
                  cellClassName,
                )}
              >
                <div className="flex h-full min-h-[12rem] w-full flex-col items-stretch gap-2 sm:min-h-[14rem]">
                  {renderCell(column, index)}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
