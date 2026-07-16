import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { bookingChipClass, bookingTheme } from './booking-theme';
import { BookingChipUnavailableMark } from './BookingChipUnavailableMark';
import { BookingSectionLabel } from './BookingPublicShell';
import type { SiteTemplate, BookingBranding } from '@/types/api';
import { cn } from '@/lib/utils';

export interface BookingDateOption {
  date: string;
  hasAvailability: boolean;
}

function parseDateOnly(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatChipDay(date: string): string {
  return parseDateOnly(date).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
}

function formatChipNumber(date: string): string {
  return String(parseDateOnly(date).getUTCDate());
}

function formatMonthYear(date: string): string {
  return parseDateOnly(date).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

interface BookingDateChipsProps {
  dates: BookingDateOption[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  siteTemplate?: SiteTemplate | null;
  branding?: BookingBranding | null;
}

export function BookingDateChips({ dates, selectedDate, onSelectDate, siteTemplate, branding }: BookingDateChipsProps) {
  const theme = bookingTheme(siteTemplate, branding);
  const [windowStart, setWindowStart] = useState(0);
  const windowSize = 7;

  const visibleDates = useMemo(
    () => dates.slice(windowStart, windowStart + windowSize),
    [dates, windowStart],
  );

  const monthLabel = selectedDate
    ? formatMonthYear(selectedDate)
    : visibleDates[0]
      ? formatMonthYear(visibleDates[0].date)
      : '';

  const canPrev = windowStart > 0;
  const canNext = windowStart + windowSize < dates.length;

  return (
    <div className="mb-6">
      <BookingSectionLabel siteTemplate={siteTemplate} branding={branding}>Select date</BookingSectionLabel>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--booking-text)]">{monthLabel}</p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous dates"
            disabled={!canPrev}
            onClick={() => setWindowStart((s) => Math.max(0, s - windowSize))}
            className={cn(
              'rounded-full p-1.5 text-[var(--booking-muted)] hover:bg-stone-100 disabled:opacity-30',
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next dates"
            disabled={!canNext}
            onClick={() => setWindowStart((s) => Math.min(dates.length - windowSize, s + windowSize))}
            className={cn(
              'rounded-full p-1.5 text-[var(--booking-muted)] hover:bg-stone-100 disabled:opacity-30',
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {visibleDates.map(({ date, hasAvailability }) => {
          const selected = selectedDate === date;
          const disabled = !hasAvailability;
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(date)}
              className={bookingChipClass(selected, disabled, theme)}
            >
              {disabled && <BookingChipUnavailableMark />}
              <span
                className={cn(
                  'relative z-[2] text-[10px] font-medium leading-none',
                  disabled ? 'text-[var(--booking-muted)]' : undefined,
                )}
              >
                {formatChipDay(date)}
              </span>
              <span
                className={cn(
                  'relative z-[2] mt-1 text-base font-semibold leading-none',
                  disabled ? 'text-[var(--booking-muted)]' : undefined,
                )}
              >
                {formatChipNumber(date)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function buildDateRange(daysAhead: number, start = new Date()): string[] {
  const dates: string[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < daysAhead; i++) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
