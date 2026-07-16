import type { BookingBranding, SiteTemplate } from '@/types/api';
import { bookingTheme } from '@/components/booking/booking-theme';
import { cn } from '@/lib/utils';

export type BookingFlowStep = 'service' | 'provider' | 'schedule' | 'details';

const FLOW_STEPS: { key: BookingFlowStep; label: string }[] = [
  { key: 'service', label: 'Service' },
  { key: 'provider', label: 'Provider' },
  { key: 'schedule', label: 'Time' },
  { key: 'details', label: 'Details' },
];

function stepIndex(step: BookingFlowStep): number {
  return FLOW_STEPS.findIndex((s) => s.key === step);
}

interface BookingStepProgressProps {
  step: BookingFlowStep;
  siteTemplate?: SiteTemplate | null;
  branding?: BookingBranding | null;
}

export function BookingStepProgress({ step, siteTemplate, branding }: BookingStepProgressProps) {
  const theme = bookingTheme(siteTemplate, branding);
  const activeIndex = stepIndex(step);

  return (
    <nav aria-label="Booking progress" className="mb-6">
      <ol className="flex items-center gap-2">
        {FLOW_STEPS.map((item, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          const upcoming = index > activeIndex;

          return (
            <li key={item.key} className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex min-w-0 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    done && 'bg-[var(--booking-primary)] text-white',
                    active && !done && 'border-2 border-[var(--booking-primary)] text-[var(--booking-primary)]',
                    upcoming && 'border border-stone-200 bg-stone-50 text-stone-400',
                  )}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span
                  className={cn(
                    'truncate text-[10px] font-medium sm:text-xs',
                    active || done ? theme.accent : 'text-stone-400',
                  )}
                >
                  {item.label}
                </span>
              </div>
              {index < FLOW_STEPS.length - 1 && (
                <div
                  className={cn(
                    'mb-5 h-px flex-1',
                    index < activeIndex ? 'bg-[var(--booking-primary)]' : 'bg-stone-200',
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface BookingSelectionSummaryProps {
  serviceName?: string;
  serviceMeta?: string;
  providerName?: string;
  siteTemplate?: SiteTemplate | null;
  branding?: BookingBranding | null;
}

export function BookingSelectionSummary({
  serviceName,
  serviceMeta,
  providerName,
  siteTemplate,
  branding,
}: BookingSelectionSummaryProps) {
  const theme = bookingTheme(siteTemplate, branding);
  if (!serviceName && !providerName) return null;

  return (
    <div className={cn('mb-5 space-y-1 rounded-xl border border-stone-200/80 bg-stone-50/80 px-3 py-2.5 text-sm', theme.mutedText)}>
      {serviceName && (
        <p>
          <span className="font-medium text-stone-700">Service:</span> {serviceName}
          {serviceMeta ? ` · ${serviceMeta}` : ''}
        </p>
      )}
      {providerName && (
        <p>
          <span className="font-medium text-stone-700">Provider:</span> {providerName}
        </p>
      )}
    </div>
  );
}
