import type { BookingBranding, SiteTemplate } from '@/types/api';
import { bookingStyleVars } from '@/lib/booking-branding';
import { BookingSectionLabel } from './BookingPublicShell';
import { bookingChipClass, bookingTheme, bookingTimeClass } from './booking-theme';
import { cn } from '@/lib/utils';

const PREVIEW_DATES = [
  { day: 'SUN', num: '1', available: false },
  { day: 'MON', num: '2', available: true },
  { day: 'TUE', num: '3', available: true },
  { day: 'WED', num: '4', available: true },
  { day: 'THU', num: '5', available: true, selected: true },
  { day: 'FRI', num: '6', available: true },
  { day: 'SAT', num: '7', available: false },
];

const PREVIEW_TIMES = [
  { label: '10:00 AM', disabled: true },
  { label: '11:00 AM', disabled: false },
  { label: '12:00 PM', disabled: false },
  { label: '1:00 PM', disabled: false, selected: true },
  { label: '2:00 PM', disabled: false },
  { label: '3:00 PM', disabled: true },
];

interface BookingPagePreviewProps {
  template: SiteTemplate;
  branding?: BookingBranding | null;
  className?: string;
}

export function BookingPagePreview({ template, branding, className }: BookingPagePreviewProps) {
  const theme = bookingTheme(template, branding);
  const styleVars = bookingStyleVars(template, branding);
  const previewDates = PREVIEW_DATES.slice(0, 5);
  const previewTimes = PREVIEW_TIMES.slice(0, 4);
  const templateLabel =
    template === 'modern' ? 'Modern · bold brand' : template === 'minimal' ? 'Minimal · sharp & clean' : 'Classic · soft & familiar';
  const backgroundImage = branding?.backgroundImageUrl;

  return (
    <div className={cn('min-w-0 max-w-full rounded-xl border border-neutral-200 bg-neutral-100 p-3 sm:p-4', className)}>
      <p className="mb-2 text-xs font-medium text-neutral-500">{templateLabel}</p>
      <div
        className={cn('relative min-w-0 overflow-hidden rounded-xl text-[var(--booking-text)]', !backgroundImage && '')}
        style={{ colorScheme: 'light', ...styleVars, ...(!backgroundImage ? theme.pageStyle : undefined) }}
      >
        {backgroundImage ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${backgroundImage})` }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-black/20" aria-hidden />
          </>
        ) : null}
        <div className="relative p-3 sm:p-4">
          {branding?.logoUrl ? (
            <div className="mb-2 flex items-center gap-2">
              <img src={branding.logoUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
              <span className="text-sm font-semibold text-neutral-800">Your salon</span>
            </div>
          ) : null}
          <div className={cn('p-3 sm:p-4', theme.card)} style={theme.cardStyle}>
            <p className={cn('mb-3', theme.title)}>Book appointment</p>
            <BookingSectionLabel siteTemplate={template} branding={branding}>
              Select date
            </BookingSectionLabel>
            <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
              {previewDates.map((d) => (
                <div
                  key={d.num}
                  className={cn(
                    bookingChipClass(!!d.selected, !d.available, theme),
                    'min-w-[2.75rem] px-2 py-2 sm:min-w-[3.25rem] sm:px-3 sm:py-2.5',
                  )}
                  aria-hidden
                >
                  <span className="text-[9px] font-medium sm:text-[10px]">{d.day}</span>
                  <span className="mt-0.5 text-sm font-semibold sm:mt-1 sm:text-base">{d.num}</span>
                </div>
              ))}
            </div>
            <BookingSectionLabel siteTemplate={template} branding={branding}>
              Select time
            </BookingSectionLabel>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
              {previewTimes.map((t) => (
                <div key={t.label} className={bookingTimeClass(!!t.selected, t.disabled, theme)} aria-hidden>
                  {t.label}
                </div>
              ))}
            </div>
            <div className={cn('mt-3 py-2 text-center text-xs font-semibold sm:mt-4 sm:py-2.5 sm:text-sm', theme.primaryBtn)}>
              Book appointment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
