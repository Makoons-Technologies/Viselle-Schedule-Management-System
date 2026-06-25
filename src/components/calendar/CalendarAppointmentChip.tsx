import type { PaymentStatus, VisitStatus } from '@/types/api';
import { getAppointmentCalendarLipClass, getAppointmentCalendarLipLabel } from '@/lib/appointment-status';
import { cn } from '@/lib/utils';

interface CalendarAppointmentChipProps {
  customerName: string;
  serviceName: string;
  visitStatus: VisitStatus;
  paymentStatus: PaymentStatus;
  isRecurring?: boolean;
  title?: string;
  onClick: () => void;
}

export function CalendarAppointmentChip({
  customerName,
  serviceName,
  visitStatus,
  paymentStatus,
  isRecurring,
  title,
  onClick,
}: CalendarAppointmentChipProps) {
  const lipClass = getAppointmentCalendarLipClass(visitStatus, paymentStatus);
  const lipLabel = getAppointmentCalendarLipLabel(visitStatus, paymentStatus);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-full min-h-[2.75rem] w-full flex-col overflow-hidden rounded-md border border-stone-200 bg-white text-left shadow-sm transition hover:border-stone-300 hover:shadow dark:border-stone-600 dark:bg-stone-800 dark:hover:border-stone-500 sm:min-h-[3rem]"
    >
      <div className="flex flex-1 flex-col justify-center gap-0.5 px-1.5 py-1 sm:gap-1 sm:px-2">
        <span className="truncate text-[11px] font-medium leading-tight text-stone-900 dark:text-stone-100 sm:text-xs">
          {customerName}
        </span>
        <span className="truncate text-[10px] leading-tight text-stone-600 dark:text-stone-300 sm:text-[11px]">
          {serviceName}
        </span>
        {isRecurring ? (
          <span className="truncate text-[9px] font-medium text-brand-600 dark:text-brand-400 sm:text-[10px]">
            Recurring
          </span>
        ) : null}
      </div>
      <div className={cn('h-1 w-full shrink-0', lipClass)} aria-hidden />
      <span className="sr-only">{lipLabel}</span>
    </button>
  );
}
