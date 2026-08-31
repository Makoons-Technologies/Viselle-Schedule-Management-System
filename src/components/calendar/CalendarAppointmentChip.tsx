import { Check } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { PaymentStatus, VisitStatus } from '@/types/api';
import { getAppointmentCalendarLipClass, getAppointmentCalendarLipLabel } from '@/lib/appointment-status';
import { cn } from '@/lib/utils';

/** Matches `SLOT_HEIGHT_REM` (one 30-minute row) when the grid does not pass height. */
export const DEFAULT_CHIP_HEIGHT_REM = 4;

export type CalendarChipDensity = 'compact' | 'short' | 'medium' | 'tall';

/** Progressive disclosure by slot height. 30-minute cells are 4rem. */
export function calendarChipDensity(heightRem: number): CalendarChipDensity {
  if (heightRem < 2.5) return 'compact';
  if (heightRem < 5.25) return 'short';
  if (heightRem < 7.25) return 'medium';
  return 'tall';
}

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
  /** Right padding so the vertical stack rail does not cover title/service text. */
  stackInset?: boolean;
  /** Visual height of the block in rem (from the week/day grid). */
  heightRem?: number;
  /** Desktop drag/resize affordances (grab cursor + bottom resize handle). */
  draggableInteraction?: boolean;
  onResizePointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
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
  stackInset = false,
  heightRem = DEFAULT_CHIP_HEIGHT_REM,
  draggableInteraction = false,
  onResizePointerDown,
}: CalendarAppointmentChipProps) {
  const lipClass = getAppointmentCalendarLipClass(visitStatus, paymentStatus);
  const lipLabel = getAppointmentCalendarLipLabel(visitStatus, paymentStatus);
  const disabled = selectMode && !selectable;
  const density = calendarChipDensity(heightRem);
  const showService = density !== 'compact';
  const showRecurring = Boolean(isRecurring) && (density === 'medium' || density === 'tall');
  const nameMultiline = density === 'medium' || density === 'tall';
  const serviceMultiline = density === 'tall';

  return (
    <button
      type="button"
      onClick={onClick}
      title={disabled ? `${title ?? ''} — not ready for checkout`.trim() : title}
      disabled={disabled}
      aria-pressed={selectMode ? selected : undefined}
      className={cn(
        'relative flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-md border text-left shadow-sm transition',
        selected
          ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200 dark:bg-brand-950/40 dark:ring-brand-800'
          : 'border-stone-200 bg-white dark:border-stone-600 dark:bg-stone-800',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : draggableInteraction
            ? 'cursor-grab active:cursor-grabbing hover:border-stone-300 hover:shadow dark:hover:border-stone-500'
            : 'hover:border-stone-300 hover:shadow dark:hover:border-stone-500',
      )}
    >
      <span
        className={cn('pointer-events-none absolute inset-y-0 left-0 z-[1] w-1', lipClass)}
        aria-hidden
      />
      <span className="sr-only">{lipLabel}</span>
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
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden',
          density === 'compact' ? 'gap-0 py-0.5' : 'gap-0.5 py-1',
          stackInset ? 'pl-2.5 pr-8' : 'pl-2.5 pr-1.5 sm:pr-2',
          draggableInteraction && 'pb-2',
        )}
      >
        <span
          className={cn(
            'min-w-0 text-[11px] font-semibold leading-tight text-stone-900 dark:text-white sm:text-xs',
            nameMultiline ? 'line-clamp-2 [overflow-wrap:anywhere]' : 'truncate',
          )}
        >
          {customerName}
        </span>
        {showService ? (
          <span
            className={cn(
              'min-w-0 text-[10px] leading-tight text-stone-600 dark:text-stone-200 sm:text-[11px]',
              serviceMultiline ? 'line-clamp-2 [overflow-wrap:anywhere]' : 'truncate',
            )}
          >
            {serviceName}
          </span>
        ) : null}
        {showRecurring ? (
          <span className="min-w-0 truncate text-[9px] font-medium text-brand-600 dark:text-brand-300 sm:text-[10px]">
            Recurring
          </span>
        ) : null}
      </div>
      {draggableInteraction && onResizePointerDown ? (
        <span
          data-resize-handle
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize appointment"
          className="absolute inset-x-0 bottom-0 z-10 flex h-2 cursor-ns-resize items-end justify-center pb-0.5"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onResizePointerDown(event);
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <span className="h-0.5 w-8 rounded-full bg-stone-300 dark:bg-stone-500" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}
