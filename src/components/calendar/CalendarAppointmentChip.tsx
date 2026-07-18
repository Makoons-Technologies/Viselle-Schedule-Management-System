import { Check } from 'lucide-react';
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
  /** When true, the chip renders in multi-select mode. */
  selectMode?: boolean;
  selected?: boolean;
  /** In select mode, whether this chip can be selected (arrived + unpaid). */
  selectable?: boolean;
}

export function CalendarAppointmentChip({
  customerName,
  serviceName,
  visitStatus,
  paymentStatus,
  isRecurring,
  title,
  onClick,
  selectMode = false,
  selected = false,
  selectable = true,
}: CalendarAppointmentChipProps) {
  const lipClass = getAppointmentCalendarLipClass(visitStatus, paymentStatus);
  const lipLabel = getAppointmentCalendarLipLabel(visitStatus, paymentStatus);
  const disabled = selectMode && !selectable;

  return (
    <button
      type="button"
      onClick={onClick}
      title={disabled ? `${title ?? ''} — not ready for checkout`.trim() : title}
      disabled={disabled}
      aria-pressed={selectMode ? selected : undefined}
      className={cn(
        'relative flex h-full min-h-[2.75rem] w-full flex-col overflow-hidden rounded-md border text-left shadow-sm transition sm:min-h-[3rem]',
        selected
          ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200 dark:bg-brand-950/40 dark:ring-brand-800'
          : 'border-stone-200 bg-white dark:border-stone-600 dark:bg-stone-800',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:border-stone-300 hover:shadow dark:hover:border-stone-500',
      )}
    >
      {selectMode && !disabled && (
        <span
          className={cn(
            'absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full border',
            selected
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-stone-300 bg-white dark:border-stone-500 dark:bg-stone-700',
          )}
          aria-hidden
        >
          {selected && <Check className="h-3 w-3" />}
        </span>
      )}
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
