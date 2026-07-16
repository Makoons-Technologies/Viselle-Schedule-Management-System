import type { PublicSlot } from '@/lib/public-booking';
import { appointmentScheduleFromIso, cn, formatTime, formatTimeRange, slotStartWallClockMs } from '@/lib/utils';
import type { SiteTemplate, BookingBranding } from '@/types/api';
import { bookingTimeClass, bookingTheme } from './booking-theme';
import { BookingSectionLabel } from './BookingPublicShell';

const GRID_START_HOUR = 9;
const GRID_END_HOUR = 18;
const GRID_INTERVAL_MINUTES = 30;

function wallClockIsoForDateTime(date: string, hours: number, minutes: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hours, minutes)).toISOString();
}

function buildTimeGrid(date: string): string[] {
  const times: string[] = [];
  for (let hour = GRID_START_HOUR; hour < GRID_END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += GRID_INTERVAL_MINUTES) {
      times.push(wallClockIsoForDateTime(date, hour, minute));
    }
  }
  return times;
}

interface BookingTimeGridProps {
  date: string;
  slots: PublicSlot[];
  selectedSlot: PublicSlot | null;
  onSelectSlot: (slot: PublicSlot) => void;
  siteTemplate?: SiteTemplate | null;
  branding?: BookingBranding | null;
}

export function BookingTimeGrid({ date, slots, selectedSlot, onSelectSlot, siteTemplate, branding }: BookingTimeGridProps) {
  const theme = bookingTheme(siteTemplate, branding);
  const slotsForDay = slots.filter((s) => appointmentScheduleFromIso(s.startTime).date === date);
  const availableByMs = new Map(slotsForDay.map((s) => [slotStartWallClockMs(s.startTime), s]));
  const gridTimes = buildTimeGrid(date);

  return (
    <div>
      <BookingSectionLabel siteTemplate={siteTemplate} branding={branding}>Select time</BookingSectionLabel>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {gridTimes.map((iso) => {
          const slot = availableByMs.get(slotStartWallClockMs(iso));
          const disabled = !slot;
          const selected = slot != null && selectedSlot?.startTime === slot.startTime;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => slot && onSelectSlot(slot)}
              className={cn(bookingTimeClass(selected, disabled, theme), 'px-2 py-2.5 text-xs leading-tight sm:text-sm')}
            >
              {slot ? formatTimeRange(slot.startTime, slot.endTime) : formatTime(iso)}
            </button>
          );
        })}
      </div>
      {slotsForDay.length === 0 && (
        <p className="mt-3 text-center text-sm text-[var(--booking-muted)]">No times available on this date.</p>
      )}
    </div>
  );
}
