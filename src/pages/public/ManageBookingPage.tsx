import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, CalendarX2, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { PageSeo } from '@/components/seo/PageSeo';
import {
  publicBookingApi,
  type CustomerAppointmentListItem,
  type CustomerAppointmentTab,
} from '@/lib/public-booking';
import { getSubdomainBookingSlug, isSubdomainBookingHost } from '@/lib/subdomain-booking';
import {
  appointmentScheduleFromIso,
  centsToDollars,
  filterFutureAppointmentSlots,
  formatDate,
  formatDateTime,
  formatLongDate,
  formatTime,
  cn,
} from '@/lib/utils';
import type { BookingBranding } from '@/types/api';

const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

type ViewMode = 'list' | 'details' | 'reschedule' | 'cancel';

const TABS: { id: CustomerAppointmentTab; label: string }[] = [
  { id: 'previous', label: 'Previous' },
  { id: 'current', label: 'Current' },
  { id: 'future', label: 'Future' },
];

interface ManageBookingPageProps {
  slugOverride?: string;
}

function visitStatusLabel(status: string) {
  switch (status) {
    case 'scheduled':
      return 'Confirmed';
    case 'arrived':
      return 'Checked in';
    case 'cancelled':
      return 'Cancelled';
    case 'missed':
      return 'Missed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export function ManageBookingPage({ slugOverride }: ManageBookingPageProps = {}) {
  const { slug: routeSlug = '', token: routeToken = '' } = useParams();
  const slug = slugOverride ?? routeSlug;
  const token = routeToken;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ViewMode>('details');
  const [activeTab, setActiveTab] = useState<CustomerAppointmentTab>('current');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ startTime: string; endTime: string; accountId: string } | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const [tabInitialized, setTabInitialized] = useState(false);

  const appointmentQuery = useQuery({
    queryKey: ['managed-appointment', token],
    queryFn: () => publicBookingApi.getManagedAppointment(token),
    enabled: !!token,
  });

  const listQuery = useQuery({
    queryKey: ['customer-appointments', token],
    queryFn: () => publicBookingApi.listCustomerAppointments(token),
    enabled: !!token,
  });

  const data = appointmentQuery.data;
  const orgSlug = data?.organization.slug ?? slug;
  const siteTemplate = data?.organization.bookingSite?.siteTemplate ?? 'classic';
  const branding: BookingBranding | null = data?.organization.bookingSite?.branding ?? null;
  const theme = bookingTheme(siteTemplate, branding);

  const lists = useMemo(() => {
    const empty = {
      previous: [] as CustomerAppointmentListItem[],
      current: [] as CustomerAppointmentListItem[],
      future: [] as CustomerAppointmentListItem[],
    };
    if (!listQuery.data) return empty;
    return {
      previous: listQuery.data.previous,
      current: listQuery.data.current,
      future: listQuery.data.future,
    };
  }, [listQuery.data]);

  useEffect(() => {
    setCancelled(false);
    setMode('details');
    setSlot(null);
    setSelectedDate(null);
    setCancelReason('');
    setTabInitialized(false);
  }, [token]);

  useEffect(() => {
    if (tabInitialized || !listQuery.data || !data) return;
    const id = data.appointment.id;
    if (lists.current.some((a) => a.id === id)) setActiveTab('current');
    else if (lists.future.some((a) => a.id === id)) setActiveTab('future');
    else if (lists.previous.some((a) => a.id === id)) setActiveTab('previous');
    else setActiveTab('current');
    setTabInitialized(true);
  }, [tabInitialized, listQuery.data, data, lists]);

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
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => publicBookingApi.cancelManagedAppointment(token, cancelReason || undefined),
    onSuccess: () => {
      setCancelled(true);
      toast.success('Appointment cancelled');
      queryClient.invalidateQueries({ queryKey: ['managed-appointment', token] });
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const confirmMutation = useMutation({
    mutationFn: () => publicBookingApi.confirmManagedAppointment(token),
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ['managed-appointment', token] });
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const managePathForToken = (nextToken: string) => {
    if (isSubdomainBookingHost() && getSubdomainBookingSlug() === (orgSlug || slug)) {
      return `/manage/${nextToken}`;
    }
    if (slugOverride) return `/manage/${nextToken}`;
    return `/book/${orgSlug || slug}/manage/${nextToken}`;
  };

  const openAppointment = (item: CustomerAppointmentListItem) => {
    setActiveTab(item.tab);
    setMode('details');
    if (item.managementToken !== token) {
      navigate(managePathForToken(item.managementToken));
    }
  };

  const selectTab = (tab: CustomerAppointmentTab) => {
    setActiveTab(tab);
    setSlot(null);
    setSelectedDate(null);
    const items = lists[tab];
    // Current with a single appointment opens detail (GlossGenius-style).
    if (tab === 'current' && items.length === 1) {
      openAppointment(items[0]);
      return;
    }
    setMode('list');
  };

  const manageSeo = (
    <PageSeo
      title="Manage appointment"
      description="View, reschedule, or cancel your appointment."
      path={slug && token ? `/book/${slug}/manage/${token}` : '/'}
      robots="noindex,nofollow"
    />
  );

  if (appointmentQuery.isLoading) {
    return (
      <BookingPublicShell showPoweredBy>
        {manageSeo}
        <LoadingState />
      </BookingPublicShell>
    );
  }

  if (!data) {
    return (
      <BookingPublicShell showPoweredBy>
        {manageSeo}
        <p className="text-center text-neutral-600">This appointment link is invalid or has expired.</p>
      </BookingPublicShell>
    );
  }

  const { organization, appointment, service, account } = data;
  const isCancelled = appointment.visitStatus === 'cancelled' || cancelled;
  const isPast = new Date(appointment.endTime).getTime() <= Date.now();
  const isCustomerConfirmed = !!appointment.customerConfirmedAt;
  const canModifySafe = !isCancelled && !isPast;

  const serviceMeta = `${service.durationMinutes} min${
    service.priceCents ? ` · $${centsToDollars(service.priceCents)}` : ''
  }`;
  const providerName = `${account.firstName} ${account.lastName}`;
  const tabItems = lists[activeTab];
  const isReceiptView = activeTab === 'previous' && appointment.paymentStatus === 'paid';

  const tabsBar = (
    <div className="mb-6 flex items-end gap-6 border-b border-[var(--booking-muted)]/25">
      {TABS.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            className={cn(
              'relative pb-2 text-sm font-medium transition-colors',
              selected ? theme.accent : theme.mutedText,
            )}
          >
            {tab.label}
            {selected && (
              <span
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--booking-primary)]"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );

  if (isCancelled && mode === 'details') {
    return (
      <BookingPublicShell businessName={organization.name} siteTemplate={siteTemplate} branding={branding}>
        {manageSeo}
        {tabsBar}
        <div className="flex flex-col items-center py-8 text-center">
          <CalendarX2 className={cn('mb-4 h-14 w-14 text-neutral-400')} />
          <h1 className="text-xl font-bold text-neutral-900">Appointment cancelled</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Your {service.name} on {formatDateTime(appointment.startTime)} has been cancelled.
          </p>
          <button
            type="button"
            onClick={() => setMode('list')}
            className={cn('mt-6 text-sm font-medium', theme.backLink)}
          >
            ← Back to appointments
          </button>
        </div>
      </BookingPublicShell>
    );
  }

  if (mode === 'reschedule' && canModifySafe) {
    return (
      <BookingPublicShell
        businessName={organization.name}
        subtitle="Reschedule"
        siteTemplate={siteTemplate}
        branding={branding}
      >
        {manageSeo}
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

  if (mode === 'cancel' && canModifySafe) {
    return (
      <BookingPublicShell
        businessName={organization.name}
        subtitle="Cancel appointment"
        siteTemplate={siteTemplate}
        branding={branding}
      >
        {manageSeo}
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

  if (mode === 'list') {
    return (
      <BookingPublicShell
        businessName={organization.name}
        subtitle="Your appointments"
        siteTemplate={siteTemplate}
        branding={branding}
      >
        {manageSeo}
        {tabsBar}
        {listQuery.isLoading ? (
          <LoadingState />
        ) : tabItems.length === 0 ? (
          <p className={cn('py-8 text-center text-sm', theme.mutedText)}>
            No {activeTab} appointments.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--booking-muted)]/20">
            {tabItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-5">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold leading-snug text-[var(--booking-text)]">
                    {formatDate(item.startTime)}
                  </p>
                  <p className={cn('mt-0.5 truncate text-sm', theme.mutedText)}>{item.serviceName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openAppointment(item)}
                  className={cn(
                    'shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors',
                    item.action === 'receipt'
                      ? theme.primaryBtn
                      : 'border border-[var(--booking-text)]/35 text-[var(--booking-text)] hover:bg-black/5',
                  )}
                >
                  {item.action === 'receipt' ? 'Receipt' : 'View'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </BookingPublicShell>
    );
  }

  const detailRows: { label: string; value: ReactNode }[] = [
    { label: 'Status', value: visitStatusLabel(appointment.visitStatus) },
    { label: 'Date', value: formatLongDate(appointment.startTime) },
    { label: 'Time', value: formatTime(appointment.startTime) },
    { label: 'Service', value: service.name },
    { label: 'Professional', value: providerName },
  ];

  if (data.location) {
    detailRows.push({
      label: 'Location',
      value: data.mapsUrl ? (
        <a
          href={data.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className={cn('underline-offset-2 hover:underline', theme.accent)}
        >
          {data.location}
        </a>
      ) : (
        data.location
      ),
    });
  }

  if (isReceiptView) {
    detailRows.push({
      label: 'Payment',
      value: appointment.paymentStatus === 'paid' ? 'Paid' : appointment.paymentStatus,
    });
  }

  return (
    <BookingPublicShell
      businessName={organization.name}
      subtitle={isReceiptView ? 'Receipt' : 'Your appointment'}
      siteTemplate={siteTemplate}
      branding={branding}
    >
      {manageSeo}
      {tabsBar}
      <button
        type="button"
        onClick={() => setMode('list')}
        className={cn('mb-3 -ml-1 text-sm font-medium', theme.backLink)}
      >
        ← All {activeTab} appointments
      </button>

      <div className="py-2">
        {!isPast && !isCancelled && (
          <>
            <CheckCircle2 className={cn('mb-3 h-10 w-10', theme.accent)} />
            <BookingPageTitle siteTemplate={siteTemplate} branding={branding}>
              Looking forward to our appointment
            </BookingPageTitle>
            <p className={cn('mb-5 text-sm', theme.mutedText)}>Please see your details below.</p>
          </>
        )}
        {isPast && !isCancelled && (
          <BookingPageTitle siteTemplate={siteTemplate} branding={branding}>
            {isReceiptView ? 'Your receipt' : 'Past appointment'}
          </BookingPageTitle>
        )}

        <dl className="divide-y divide-[var(--booking-muted)]/20">
          {detailRows.map((row) => (
            <div key={row.label} className="py-3.5">
              <dt className={cn('text-xs font-medium uppercase tracking-wide', theme.mutedText)}>
                {row.label}
              </dt>
              <dd className="mt-1 text-base font-medium leading-snug text-[var(--booking-text)]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {appointment.appointmentNotes && (
          <p className={cn('mt-3 text-sm', theme.mutedText)}>Notes: {appointment.appointmentNotes}</p>
        )}

        {!isCancelled && !isPast && (
          <div className="mt-6 space-y-3">
            {isCustomerConfirmed ? (
              <p className={cn('text-center text-sm', theme.mutedText)}>
                This appointment has been confirmed.
              </p>
            ) : (
              <BookingStickyAction siteTemplate={siteTemplate} branding={branding}>
                <button
                  type="button"
                  disabled={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate()}
                  className={cn(
                    'w-full rounded-full py-4 text-base font-semibold transition-colors disabled:opacity-40',
                    theme.primaryBtn,
                  )}
                >
                  {confirmMutation.isPending ? 'Confirming…' : 'Confirm'}
                </button>
              </BookingStickyAction>
            )}
          </div>
        )}

        {canModifySafe && (
          <div className="mt-6 space-y-3 text-center">
            <button
              type="button"
              onClick={() => setMode('reschedule')}
              className={cn('block w-full text-sm font-semibold underline-offset-2 hover:underline', theme.accent)}
            >
              Reschedule appointment
            </button>
            <button
              type="button"
              onClick={() => setMode('cancel')}
              className={cn('block w-full text-sm font-semibold underline-offset-2 hover:underline', theme.mutedText)}
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

        {!isCancelled && !isPast && (data.googleCalendarUrl || data.calendarUrl) && (
          <div className="mt-8">
            <p className={cn('mb-3 text-center text-xs font-semibold uppercase tracking-[0.15em]', theme.mutedText)}>
              Add to your calendar
            </p>
            <div className="space-y-3">
              {data.googleCalendarUrl && (
                <a
                  href={data.googleCalendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--booking-text)]/25 py-3.5 text-sm font-semibold text-[var(--booking-text)] transition-colors hover:bg-black/5"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Google Calendar
                </a>
              )}
              {data.calendarUrl && (
                <a
                  href={data.calendarUrl}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--booking-text)]/25 py-3.5 text-sm font-semibold text-[var(--booking-text)] transition-colors hover:bg-black/5"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Calendar (.ics)
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </BookingPublicShell>
  );
}
