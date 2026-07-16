import type { BookingBranding, SiteTemplate } from '@/types/api';
import { bookingStyleVars } from '@/lib/booking-branding';
import { BookingSectionLabel } from './BookingPublicShell';
import { bookingChipClass, bookingTheme, bookingTimeClass } from './booking-theme';
import { BookingChipUnavailableMark } from './BookingChipUnavailableMark';
import { cn } from '@/lib/utils';

const PREVIEW_DATES = [
  { day: 'SUN', num: '1', available: false },
  { day: 'MON', num: '2', available: true },
  { day: 'TUE', num: '3', available: true, selected: true },
  { day: 'WED', num: '4', available: true },
];

const PREVIEW_TIMES = [
  { label: '10:00 AM', disabled: true },
  { label: '11:00 AM', disabled: false },
  { label: '1:00 PM', disabled: false, selected: true },
  { label: '2:00 PM', disabled: false },
];

interface BookingPagePreviewProps {
  template: SiteTemplate;
  branding?: BookingBranding | null;
  className?: string;
}

export function BookingPagePreview({ template, branding, className }: BookingPagePreviewProps) {
  const theme = bookingTheme(template, branding);
  const styleVars = bookingStyleVars(template, branding);
  const templateLabel =
    template === 'modern' ? 'Modern · bold brand' : template === 'minimal' ? 'Minimal · sharp & clean' : 'Classic · soft & familiar';
  const backgroundImage = branding?.backgroundImageUrl;

  return (
    <div className={cn('min-w-0 max-w-full rounded-xl border border-neutral-200 bg-neutral-100 p-3 dark:border-stone-700 dark:bg-stone-800', className)}>
      <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-stone-300">{templateLabel}</p>
      <div
        className="relative min-w-0 overflow-hidden rounded-xl text-[var(--booking-text)]"
        style={{ colorScheme: 'light', ...styleVars, ...(!backgroundImage ? theme.pageStyle : undefined) }}
      >
        {backgroundImage ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${backgroundImage})` }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-black/25" aria-hidden />
          </>
        ) : null}

        <div className="relative">
          <div className={cn(theme.header, 'px-3 py-2.5')} style={theme.headerStyle}>
            <div className="flex min-w-0 items-center gap-2">
              {branding?.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-md border border-white/20 bg-white/90 object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <p className={cn(theme.headerTitle, 'truncate text-sm')}>Your salon</p>
                <p className={cn(theme.headerSubtitle, 'text-[10px]')}>Book online</p>
              </div>
            </div>
          </div>

          <div className="px-2.5 py-3 sm:px-3">
            <div className={cn('min-w-0 overflow-hidden p-2.5 sm:p-3', theme.card)} style={theme.cardStyle}>
              <p className={cn('mb-2.5 truncate text-sm', theme.title)}>Book appointment</p>
              <BookingSectionLabel siteTemplate={template} branding={branding}>
                Select date
              </BookingSectionLabel>
              <div className="mb-3 flex gap-1.5 overflow-hidden">
                {PREVIEW_DATES.map((d) => (
                  <div
                    key={d.num}
                    className={cn(
                      bookingChipClass(!!d.selected, !d.available, theme),
                      'min-w-0 flex-1 px-1 py-2',
                    )}
                    aria-hidden
                  >
                    {!d.available && <BookingChipUnavailableMark />}
                    <span className="relative z-[2] text-[9px] font-medium leading-none">{d.day}</span>
                    <span className="relative z-[2] mt-1 text-sm font-semibold leading-none">{d.num}</span>
                  </div>
                ))}
              </div>
              <BookingSectionLabel siteTemplate={template} branding={branding}>
                Select time
              </BookingSectionLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {PREVIEW_TIMES.map((t) => (
                  <div
                    key={t.label}
                    className={cn(
                      bookingTimeClass(!!t.selected, t.disabled, theme),
                      'truncate px-2 py-2 text-center text-xs',
                    )}
                    aria-hidden
                  >
                    {t.label}
                  </div>
                ))}
              </div>
              <div className={cn('mt-3 truncate rounded-full py-2 text-center text-xs font-semibold', theme.primaryBtn)}>
                Book appointment
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
