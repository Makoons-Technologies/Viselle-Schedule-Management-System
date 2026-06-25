import type { VisitStatus } from '@/types/api';
import { VISIT_STATUS_LABEL, VISIT_STATUS_LIP_CLASS } from '@/lib/appointment-status';
import { cn } from '@/lib/utils';

interface CalendarAppointmentChipProps {
  customerName: string;
  serviceName: string;
  visitStatus: VisitStatus;
  isRecurring?: boolean;
  title?: string;
  onClick: () => void;
}

export function CalendarAppointmentChip({
  customerName,
  serviceName,
  visitStatus,
  isRecurring,
  title,
  onClick,
}: CalendarAppointmentChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-full min-h-[2.75rem] w-full flex-col overflow-hidden rounded-md border border-stone-200 bg-white text-left shadow-sm transition hover:border-stone-300 hover:shadow dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-600 sm:min-h-[3rem]"
    >
      <div className="flex flex-1 flex-col justify-center gap-0.5 px-1.5 py-1 sm:gap-1 sm:px-2">
        <span className="truncate text-[11px] font-medium leading-tight sm:text-xs">{customerName}</span>
        <span className="truncate text-[10px] leading-tight text-stone-500 dark:text-stone-400 sm:text-[11px]">
          {serviceName}
        </span>
        {isRecurring ? (
          <span className="truncate text-[9px] font-medium text-brand-600 dark:text-brand-300 sm:text-[10px]">
            Recurring
          </span>
        ) : null}
      </div>
      <div
        className={cn('h-1 w-full shrink-0', VISIT_STATUS_LIP_CLASS[visitStatus])}
        aria-hidden
      />
      <span className="sr-only">{VISIT_STATUS_LABEL[visitStatus]}</span>
    </button>
  );
}
