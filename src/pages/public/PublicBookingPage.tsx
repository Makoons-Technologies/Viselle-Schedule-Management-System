import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BookingDateChips, buildDateRange } from '@/components/booking/BookingDateChips';
import {
  BookingPageTitle,
  BookingPublicShell,
  BookingSectionLabel,
  BookingStickyAction,
} from '@/components/booking/BookingPublicShell';
import { BookingStepProgress, BookingSelectionSummary } from '@/components/booking/BookingStepProgress';
import { BookingTimeGrid } from '@/components/booking/BookingTimeGrid';
import { bookingChoiceClass, bookingTheme } from '@/components/booking/booking-theme';
import { LoadingState } from '@/components/common/LoadingState';
import { publicBookingApi, getManageBookingUrl } from '@/lib/public-booking';
import { centsToDollars, filterFutureAppointmentSlots, formatDateTime, appointmentScheduleFromIso, cn } from '@/lib/utils';
import type { Service, BookingBranding } from '@/types/api';

const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

type Step = 'service' | 'provider' | 'schedule' | 'details';

interface PublicBookingPageProps {
  /** When set (e.g. hosted subdomain), slug comes from hostname instead of /book/:slug. */
  slugOverride?: string;
}

export function PublicBookingPage({ slugOverride }: PublicBookingPageProps = {}) {
  const { slug: routeSlug = '' } = useParams();
  const slug = slugOverride ?? routeSlug;
  const [step, setStep] = useState<Step>('service');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ startTime: string; endTime: string; accountId: string } | null>(null);
  const [customer, setCustomer] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [managementToken, setManagementToken] = useState<string | null>(null);

  const orgQuery = useQuery({
    queryKey: ['public-org', slug],
    queryFn: () => publicBookingApi.getOrganization(slug),
    enabled: !!slug,
  });

  const siteTemplate = orgQuery.data?.organization.bookingSite?.siteTemplate ?? 'classic';
  const branding: BookingBranding | null = orgQuery.data?.organization.bookingSite?.branding ?? null;
  const theme = bookingTheme(siteTemplate, branding);

  const servicesQuery = useQuery({
    queryKey: ['public-services', slug],
    queryFn: () => publicBookingApi.getServices(slug),
    enabled: !!slug && orgQuery.data?.organization.publicBookingEnabled,
  });

  const accountsQuery = useQuery({
    queryKey: ['public-accounts', slug],
    queryFn: () => publicBookingApi.getAccounts(slug),
    enabled: !!slug && !!serviceId,
  });

  const dateRange = useMemo(() => {
    const dates = buildDateRange(14);
    return { startDate: dates[0], endDate: dates[dates.length - 1] };
  }, []);

  const slotsQuery = useQuery({
    queryKey: ['public-slots', slug, serviceId, accountId, dateRange],
    queryFn: () =>
      publicBookingApi.getAvailability(slug, {
        serviceId: serviceId!,
        accountId: accountId ?? undefined,
        ...dateRange,
        timezone: TIMEZONE,
      }),
    enabled: !!slug && !!serviceId && !!accountId && (step === 'schedule' || step === 'details'),
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      publicBookingApi.book(slug, {
        accountId: slot!.accountId,
        serviceId: serviceId!,
        customer: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email || undefined,
          phone: customer.phone || undefined,
        },
        startTime: slot!.startTime,
        timezone: TIMEZONE,
        appointmentNotes: notes || undefined,
      }),
    onSuccess: (data) => {
      setManagementToken(data.managementToken ?? null);
      setConfirmed(true);
      toast.success('Appointment booked!');
    },
    onError: (err: Error) => toast.error(err.message),
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

  useEffect(() => {
    if (step !== 'schedule' || selectedDate) return;
    const firstAvailable = dateOptions.find((d) => d.hasAvailability);
    if (firstAvailable) setSelectedDate(firstAvailable.date);
  }, [step, selectedDate, dateOptions]);

  if (orgQuery.isLoading) {
    return (
      <BookingPublicShell showPoweredBy>
        <LoadingState />
      </BookingPublicShell>
    );
  }

  const org = orgQuery.data?.organization;
  if (!org || !org.publicBookingEnabled) {
    return (
      <BookingPublicShell showPoweredBy>
        <p className="text-center text-neutral-600">Online booking is not available for this business.</p>
      </BookingPublicShell>
    );
  }

  const services = servicesQuery.data?.services ?? [];
  const accounts = accountsQuery.data?.accounts ?? [];
  const selectedService = services.find((s) => s.id === serviceId);
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const serviceMeta = selectedService
    ? `${selectedService.durationMinutes} min${selectedService.priceCents ? ` · $${centsToDollars(selectedService.priceCents)}` : ''}`
    : undefined;
  const providerName = selectedAccount
    ? `${selectedAccount.firstName} ${selectedAccount.lastName}`
    : undefined;

  if (confirmed) {
    const manageUrl =
      managementToken && slug ? getManageBookingUrl(slug, managementToken) : null;

    return (
      <BookingPublicShell businessName={org.name} siteTemplate={siteTemplate} branding={branding}>
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className={cn('mb-4 h-14 w-14', theme.accent)} />
          <h1 className="text-xl font-bold text-neutral-900">You&apos;re booked!</h1>
          <p className="mt-2 text-sm text-neutral-600">{formatDateTime(slot!.startTime)}</p>
          {manageUrl ? (
            <div className="mt-6 w-full max-w-sm space-y-3">
              <a
                href={manageUrl}
                className={cn(
                  'block w-full rounded-full py-3.5 text-center text-sm font-semibold transition-colors',
                  theme.primaryBtn,
                )}
              >
                Manage or cancel appointment
              </a>
              <p className={cn('text-xs', theme.mutedText)}>
                Bookmark this link to reschedule or cancel later.
              </p>
              <p className={cn('break-all rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-left text-xs text-stone-600')}>
                {manageUrl}
              </p>
            </div>
          ) : null}
        </div>
      </BookingPublicShell>
    );
  }

  const goBack = () => {
    if (step === 'details') setStep('schedule');
    else if (step === 'schedule') setStep('provider');
    else if (step === 'provider') setStep('service');
  };

  const choiceClass = (selected: boolean) => bookingChoiceClass(selected, theme);

  return (
    <BookingPublicShell businessName={org.name} subtitle="Book online" siteTemplate={siteTemplate} branding={branding}>
      {step !== 'service' && (
        <button
          type="button"
          onClick={goBack}
          className={cn('mb-2 -ml-1 text-sm font-medium', theme.backLink)}
        >
          ← Back
        </button>
      )}

      {!confirmed && (
        <BookingStepProgress step={step} siteTemplate={siteTemplate} branding={branding} />
      )}

      {step === 'service' && (
        <>
          <BookingPageTitle siteTemplate={siteTemplate} branding={branding}>Book appointment</BookingPageTitle>
          <BookingSectionLabel siteTemplate={siteTemplate} branding={branding}>1. Choose a service</BookingSectionLabel>
          {servicesQuery.isLoading ? (
            <LoadingState />
          ) : services.length === 0 ? (
            <p className={cn('text-sm', theme.mutedText)}>No services are available for online booking right now.</p>
          ) : (
            <div className="space-y-2.5">
              {services.map((service: Service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setServiceId(service.id);
                    setAccountId(null);
                    setSlot(null);
                    setSelectedDate(null);
                    setStep('provider');
                  }}
                  className={choiceClass(serviceId === service.id)}
                >
                  <p className="font-semibold text-neutral-900">{service.name}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {service.durationMinutes} min
                    {service.priceCents ? ` · $${centsToDollars(service.priceCents)}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === 'provider' && (
        <>
          <BookingPageTitle siteTemplate={siteTemplate} branding={branding}>Choose your provider</BookingPageTitle>
          <BookingSelectionSummary
            serviceName={selectedService?.name}
            serviceMeta={serviceMeta}
            siteTemplate={siteTemplate}
            branding={branding}
          />
          <BookingSectionLabel siteTemplate={siteTemplate} branding={branding}>2. Who would you like to see?</BookingSectionLabel>
          {accountsQuery.isLoading ? (
            <LoadingState />
          ) : accounts.length === 0 ? (
            <p className={cn('text-sm', theme.mutedText)}>
              No providers are available for online booking. Try another service or contact the business directly.
            </p>
          ) : (
            <div className="space-y-2.5">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    setAccountId(account.id);
                    setSlot(null);
                    setSelectedDate(null);
                    setStep('schedule');
                  }}
                  className={choiceClass(accountId === account.id)}
                >
                  <p className="font-semibold text-neutral-900">
                    {account.firstName} {account.lastName}
                  </p>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === 'schedule' && (
        <>
          <BookingPageTitle siteTemplate={siteTemplate} branding={branding}>Pick a time</BookingPageTitle>
          <BookingSelectionSummary
            serviceName={selectedService?.name}
            serviceMeta={serviceMeta}
            providerName={providerName}
            siteTemplate={siteTemplate}
            branding={branding}
          />
          <BookingSectionLabel siteTemplate={siteTemplate} branding={branding}>3. Select date and time</BookingSectionLabel>
          {!accountId ? (
            <p className={cn('text-sm', theme.mutedText)}>Choose a provider first.</p>
          ) : slotsQuery.isLoading ? (
            <LoadingState />
          ) : slots.length === 0 ? (
            <p className={cn('text-sm', theme.mutedText)}>No open times in the next two weeks. Try another provider.</p>
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
                  disabled={!slot}
                  onClick={() => setStep('details')}
                  className={cn(
                    'w-full rounded-full py-4 text-base font-semibold transition-colors disabled:opacity-40',
                    theme.primaryBtn,
                  )}
                >
                  Continue
                </button>
              </BookingStickyAction>
            </>
          )}
        </>
      )}

      {step === 'details' && selectedService && slot && (
        <>
          <BookingPageTitle siteTemplate={siteTemplate} branding={branding}>Your details</BookingPageTitle>
          <BookingSelectionSummary
            serviceName={selectedService.name}
            serviceMeta={serviceMeta}
            providerName={providerName}
            siteTemplate={siteTemplate}
            branding={branding}
          />
          <p className={cn('mb-5 text-sm', theme.mutedText)}>{formatDateTime(slot.startTime)}</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cn('mb-1.5 block text-xs font-medium', theme.mutedText)}>First name</label>
                <input
                  className={cn('w-full px-3 py-3 text-sm outline-none', theme.input)}
                  value={customer.firstName}
                  onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className={cn('mb-1.5 block text-xs font-medium', theme.mutedText)}>Last name</label>
                <input
                  className={cn('w-full px-3 py-3 text-sm outline-none', theme.input)}
                  value={customer.lastName}
                  onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={cn('mb-1.5 block text-xs font-medium', theme.mutedText)}>Email</label>
              <input
                type="email"
                className={cn('w-full px-3 py-3 text-sm outline-none', theme.input)}
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              />
            </div>
            <div>
              <label className={cn('mb-1.5 block text-xs font-medium', theme.mutedText)}>Phone</label>
              <input
                type="tel"
                className={cn('w-full px-3 py-3 text-sm outline-none', theme.input)}
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
            <div>
              <label className={cn('mb-1.5 block text-xs font-medium', theme.mutedText)}>Notes (optional)</label>
              <textarea
                rows={3}
                className={cn('w-full px-3 py-3 text-sm outline-none', theme.input)}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <BookingStickyAction siteTemplate={siteTemplate} branding={branding}>
            <button
              type="button"
              disabled={!customer.firstName || !customer.lastName || bookMutation.isPending}
              onClick={() => bookMutation.mutate()}
              className={cn(
                'w-full rounded-full py-4 text-base font-semibold transition-colors disabled:opacity-40',
                theme.primaryBtn,
              )}
            >
              {bookMutation.isPending ? 'Booking…' : 'Book appointment'}
            </button>
          </BookingStickyAction>
        </>
      )}
    </BookingPublicShell>
  );
}
