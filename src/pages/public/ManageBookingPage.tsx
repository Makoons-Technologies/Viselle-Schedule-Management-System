import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarX2, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BookingDateChips, buildDateRange } from '@/components/booking/BookingDateChips';
import {
  BookingPageTitle,
  BookingPublicShell,
  BookingSectionLabel,
  BookingStickyAction,
} from '@/components/booking/BookingPublicShell';
import { BookingSelectionSummary } from '@/components/booking/BookingStepProgress';
import { BookingTimeGrid } from '@/components/booking/BookingTimeGrid';
import { bookingTheme } from '@/components/booking/booking-theme';
import { LoadingState } from '@/components/common/LoadingState';
import { publicBookingApi } from '@/lib/public-booking';
import {
  appointmentScheduleFromIso,
  centsToDollars,
  filterFutureAppointmentSlots,
  formatDateTime,
  cn,
} from '@/lib/utils';
import type { BookingBranding } from '@/types/api';

const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

type ViewMode = 'details' | 'reschedule' | 'cancel';

interface ManageBookingPageProps {
  slugOverride?: string;
}

export function ManageBookingPage({ slugOverride }: ManageBookingPageProps = {}) {
  const { slug: routeSlug = '', token: routeToken = '' } = useParams();
  const slug = slugOverride ?? routeSlug;
  const token = routeToken;
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ViewMode>('details');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ startTime: string; endTime: string; accountId: string } | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState('');
  const [cancelled, setCancelled] = useState(false);

  const appointmentQuery = useQuery({
    queryKey: ['managed-appointment', token],
    queryFn: () => publicBookingApi.getManagedAppointment(token),
    enabled: !!token,
  });

  const data = appointmentQuery.data;
  const orgSlug = data?.organization.slug ?? slug;
  const siteTemplate = data?.organization.bookingSite?.siteTemplate ?? 'classic';
  const branding: BookingBranding | null = data?.organization.bookingSite?.branding ?? null;
  const theme = bookingTheme(siteTemplate, branding);

  const dateRange = useMemo(() => {
    const dates = buildDateRange(14);
    return { startDate: dates[0], endDate: dates[dates.length - 1] };
  }, []);

  const slotsQuery = useQuery({
    queryKey: ['public-slots-manage', orgSlug, data?.service.id, data?.account.id, dateRange],
    queryFn: () =>
      publicBookingApi.getAvailability(orgSlug, {
        serviceId: data!.service.id,
        accountId: data!.account.id,
        ...dateRange,
        timezone: TIMEZONE,
      }),
    enabled: !!orgSlug && !!data && mode === 'reschedule',
  });

  const slots = useMemo(
    () => filterFutureAppointmentSlots(slotsQuery.data?.availableSlots ?? []),
    [slotsQuery.data?.availableSlots],
  );

  const dateOptions = useMemo(() => {
    const dates = buildDateRange(14);
    const datesWithSlots = new Set(slots.map((s) => appointmentScheduleFromIso(s.startTime).date));
    return dates.map((date) => ({ date, hasAvailability: datesWithSlots.has(date) }));
  }, [slots]);

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      publicBookingApi.rescheduleManagedAppointment(token, {
        startTime: slot!.startTime,
        timezone: TIMEZONE,
      }),
    onSuccess: () => {
      toast.success('Appointment rescheduled');
      setMode('details');
      setSlot(null);
      setSelectedDate(null);
      queryClient.invalidateQueries({ queryKey: ['managed-appointment', token] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => publicBookingApi.cancelManagedAppointment(token, cancelReason || undefined),
    onSuccess: () => {
      setCancelled(true);
      toast.success('Appointment cancelled');
      queryClient.invalidateQueries({ queryKey: ['managed-appointment', token] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (appointmentQuery.isLoading) {
    return (
      <BookingPublicShell showPoweredBy>
        <LoadingState />
      </BookingPublicShell>
    );
  }

  if (!data) {
    return (
      <BookingPublicShell showPoweredBy>
        <p className="text-center text-neutral-600">This appointment link is invalid or has expired.</p>
      </BookingPublicShell>
    );
  }

  const { organization, appointment, service, account } = data;
  const isCancelled = appointment.visitStatus === 'cancelled' || cancelled;
  const isPast = new Date(appointment.startTime).getTime() < Date.now();
  const canModify = !isCancelled && !isPast && !appointmentQuery.isError;

  const serviceMeta = `${service.durationMinutes} min${
    service.priceCents ? ` · $${centsToDollars(service.priceCents)}` : ''
  }`;
  const providerName = `${account.firstName} ${account.lastName}`;

  if (isCancelled) {
    return (
      <BookingPublicShell businessName={organization.name} siteTemplate={siteTemplate} branding={branding}>
        <div className="flex flex-col items-center py-8 text-center">
          <CalendarX2 className={cn('mb-4 h-14 w-14 text-neutral-400')} />
          <h1 className="text-xl font-bold text-neutral-900">Appointment cancelled</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Your {service.name} on {formatDateTime(appointment.startTime)} has been cancelled.
          </p>
        </div>
      </BookingPublicShell>
    );
  }

  if (mode === 'reschedule' && canModify) {
    return (
      <BookingPublicShell
        businessName={organization.name}
        subtitle="Reschedule"
        siteTemplate={siteTemplate}
        branding={branding}
      >
        <button
          type="button"
          onClick={() => {
            setMode('details');
            setSlot(null);
            setSelectedDate(null);
          }}
          className={cn('mb-2 -ml-1 text-sm font-medium', theme.backLink)}
        >
          ← Back to appointment
        </button>
        <BookingPageTitle siteTemplate={siteTemplate} branding={branding}>
          Pick a new time
        </BookingPageTitle>
        <BookingSelectionSummary
          serviceName={service.name}
          serviceMeta={serviceMeta}
          providerName={providerName}
          siteTemplate={siteTemplate}
          branding={branding}
        />
        <BookingSectionLabel siteTemplate={siteTemplate} branding={branding}>
          Select date and time
        </BookingSectionLabel>
        {slotsQuery.isLoading ? (
          <LoadingState />
        ) : slots.length === 0 ? (
          <p className={cn('text-sm', theme.mutedText)}>No open times in the next two weeks.</p>
        ) : (
          <>
            <BookingDateChips
              dates={dateOptions}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSlot(null);
              }}
              siteTemplate={siteTemplate}
              branding={branding}
            />
            {selectedDate && (
              <BookingTimeGrid
                date={selectedDate}
                slots={slots}
                selectedSlot={slot}
                onSelectSlot={setSlot}
                siteTemplate={siteTemplate}
                branding={branding}
              />
            )}
            <BookingStickyAction siteTemplate={siteTemplate} branding={branding}>
              <button
                type="button"
                disabled={!slot || rescheduleMutation.isPending}
                onClick={() => rescheduleMutation.mutate()}
                className={cn(
                  'w-full rounded-full py-4 text-base font-semibold transition-colors disabled:opacity-40',
                  theme.primaryBtn,
                )}
              >
                {rescheduleMutation.isPending ? 'Saving…' : 'Confirm new time'}
              </button>
            </BookingStickyAction>
          </>
        )}
      </BookingPublicShell>
    );
  }

  if (mode === 'cancel' && canModify) {
    return (
      <BookingPublicShell
        businessName={organization.name}
        subtitle="Cancel appointment"
        siteTemplate={siteTemplate}
        branding={branding}
      >
        <button
          type="button"
          onClick={() => setMode('details')}
          className={cn('mb-2 -ml-1 text-sm font-medium', theme.backLink)}
        >
          ← Back to appointment
        </button>
        <BookingPageTitle siteTemplate={siteTemplate} branding={branding}>
          Cancel this appointment?
        </BookingPageTitle>
        <p className={cn('mb-4 text-sm', theme.mutedText)}>
          {service.name} with {providerName} on {formatDateTime(appointment.startTime)}
        </p>
        <div className="mb-6">
          <label className={cn('mb-1.5 block text-xs font-medium', theme.mutedText)}>
            Reason (optional)
          </label>
          <textarea
            rows={3}
            className={cn('w-full px-3 py-3 text-sm outline-none', theme.input)}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
        <BookingStickyAction siteTemplate={siteTemplate} branding={branding}>
          <button
            type="button"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
            className="w-full rounded-full border border-red-200 bg-red-50 py-4 text-base font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-40"
          >
            {cancelMutation.isPending ? 'Cancelling…' : 'Yes, cancel appointment'}
          </button>
        </BookingStickyAction>
      </BookingPublicShell>
    );
  }

  return (
    <BookingPublicShell
      businessName={organization.name}
      subtitle="Your appointment"
      siteTemplate={siteTemplate}
      branding={branding}
    >
      <div className="py-4">
        <CheckCircle2 className={cn('mb-4 h-12 w-12', theme.accent)} />
        <BookingPageTitle siteTemplate={siteTemplate} branding={branding}>
          {isPast ? 'Past appointment' : 'Upcoming appointment'}
        </BookingPageTitle>
        <BookingSelectionSummary
          serviceName={service.name}
          serviceMeta={serviceMeta}
          providerName={providerName}
          siteTemplate={siteTemplate}
          branding={branding}
        />
        <p className={cn('mt-3 text-sm font-medium text-neutral-900')}>
          {formatDateTime(appointment.startTime)}
        </p>
        {appointment.appointmentNotes && (
          <p className={cn('mt-3 text-sm', theme.mutedText)}>Notes: {appointment.appointmentNotes}</p>
        )}
        {canModify && (
          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => setMode('reschedule')}
              className={cn(
                'w-full rounded-full py-4 text-base font-semibold transition-colors',
                theme.primaryBtn,
              )}
            >
              Reschedule
            </button>
            <button
              type="button"
              onClick={() => setMode('cancel')}
              className="w-full rounded-full border border-neutral-200 py-4 text-base font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Cancel appointment
            </button>
          </div>
        )}
        {isPast && !isCancelled && (
          <p className={cn('mt-6 text-sm', theme.mutedText)}>
            This appointment has already passed and can no longer be changed online.
          </p>
        )}
      </div>
    </BookingPublicShell>
  );
}
