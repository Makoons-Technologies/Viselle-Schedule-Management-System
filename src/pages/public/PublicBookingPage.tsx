import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BookingDateChips, buildDateRange } from '@/components/booking/BookingDateChips';
import { FirstVisitProtectionCard } from '@/components/booking/FirstVisitProtectionCard';
import {
  BookingPageTitle,
  BookingPublicShell,
  BookingSectionLabel,
  BookingStickyAction,
} from '@/components/booking/BookingPublicShell';
import { BookingStepProgress, BookingSelectionSummary } from '@/components/booking/BookingStepProgress';
import { BookingTimeGrid } from '@/components/booking/BookingTimeGrid';
import { PublicBookingSeo } from '@/components/booking/PublicBookingSeo';
import { bookingChoiceClass, bookingTheme } from '@/components/booking/booking-theme';
import { LoadingState } from '@/components/common/LoadingState';
import { PageSeo } from '@/components/seo/PageSeo';
import { SmsOptInCheckbox } from '@/components/booking/SmsOptInCheckbox';
import { ApiError } from '@/lib/api';
import {
  firstVisitBookLabel,
  firstVisitConfirmCopy,
  firstVisitProtectionHeadline,
} from '@/lib/first-visit-protection';
import { publicBookingApi, getManageBookingUrl } from '@/lib/public-booking';
import type { FirstVisitCardSession } from '@/lib/stripe-first-visit';
import { createFirstVisitCardSession } from '@/lib/stripe-first-visit';
import { SMS_UNDER_REVIEW_OPT_IN_NOTE } from '@/lib/sms';
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
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [managementToken, setManagementToken] = useState<string | null>(null);
  const [cardSession, setCardSession] = useState<FirstVisitCardSession | null>(null);
  const [cardSessionError, setCardSessionError] = useState<string | null>(null);
  const [confirmingCard, setConfirmingCard] = useState(false);
  const [protectionCollected, setProtectionCollected] = useState(false);

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
    enabled:
      !!slug &&
      !!orgQuery.data?.organization.publicBookingEnabled &&
      (Boolean(slugOverride) || orgQuery.data.organization.bookingSite?.pathBookingEnabled !== false),
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

  const protectionPolicy = orgQuery.data?.organization.firstVisitProtection;
  const protectionEnabled = Boolean(protectionPolicy?.enabled);
  const identityReady = Boolean(
    customer.firstName.trim() && customer.lastName.trim() && customer.email.trim(),
  );

  const protectionQuery = useQuery({
    queryKey: [
      'public-first-visit-protection',
      slug,
      serviceId,
      customer.firstName.trim(),
      customer.lastName.trim(),
      customer.email.trim(),
      customer.phone.trim(),
    ],
    queryFn: async () => {
      try {
        return await publicBookingApi.createFirstVisitProtection(slug, {
          serviceId: serviceId!,
          customer: {
            firstName: customer.firstName.trim(),
            lastName: customer.lastName.trim(),
            email: customer.email.trim() || undefined,
            phone: customer.phone.trim() || undefined,
          },
        });
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
          return {
            required: false,
            mode: protectionPolicy?.mode ?? null,
            depositCents: protectionPolicy?.depositCents ?? null,
            reason: 'endpoint_unavailable' as const,
            stripe: null,
          };
        }
        throw err;
      }
    },
    enabled: step === 'details' && protectionEnabled && !!slug && !!serviceId && identityReady,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    const stripe = protectionQuery.data?.stripe;
    if (!stripe) {
      setCardSession(null);
      setCardSessionError(null);
      return;
    }

    let cancelled = false;
    let session: FirstVisitCardSession | null = null;
    setCardSessionError(null);
    void createFirstVisitCardSession({
      clientSecret: stripe.clientSecret,
      intentType: stripe.intentType,
      stripeAccountId: stripe.stripeAccountId,
      publishableKey: stripe.publishableKey,
    })
      .then((next) => {
        if (cancelled) {
          next.destroy();
          return;
        }
        session = next;
        setCardSession(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setCardSession(null);
          setCardSessionError(err instanceof Error ? err.message : 'Could not load card form');
        }
      });

    return () => {
      cancelled = true;
      session?.destroy();
      setCardSession(null);
    };
  }, [protectionQuery.data?.stripe?.clientSecret, protectionQuery.data?.stripe?.intentType, protectionQuery.data?.stripe?.stripeAccountId, protectionQuery.data?.stripe?.publishableKey]);

  const bookMutation = useMutation({
    mutationFn: (intents?: { paymentIntentId?: string; setupIntentId?: string }) =>
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
        smsOptIn: smsOptIn || undefined,
        paymentIntentId: intents?.paymentIntentId,
        setupIntentId: intents?.setupIntentId,
      }),
    onSuccess: (data) => {
      setManagementToken(data.managementToken ?? null);
      setConfirmed(true);
      toast.success('Appointment booked!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submitBooking = async () => {
    if (cardSession) {
      setConfirmingCard(true);
      try {
        const confirmedIntent = await cardSession.confirm();
        setProtectionCollected(true);
        bookMutation.mutate({
          paymentIntentId: confirmedIntent.intentType === 'payment' ? confirmedIntent.intentId : undefined,
          setupIntentId: confirmedIntent.intentType === 'setup' ? confirmedIntent.intentId : undefined,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Card confirmation failed');
      } finally {
        setConfirmingCard(false);
      }
      return;
    }
    bookMutation.mutate(undefined);
  };

  const phoneTrimmed = customer.phone.trim();
  const emailTrimmed = customer.email.trim();
  const smsRemindersEnabled = Boolean(orgQuery.data?.organization.smsRemindersEnabled);
  const smsSendingOn = orgQuery.data?.organization.smsSendingEnabled === true;
  const consentQuery = useQuery({
    queryKey: ['public-sms-consent', slug, emailTrimmed, phoneTrimmed],
    queryFn: () =>
      publicBookingApi.getSmsConsent(slug, {
        email: emailTrimmed || undefined,
        phone: phoneTrimmed || undefined,
      }),
    enabled: step === 'details' && !!slug && smsRemindersEnabled && Boolean(emailTrimmed || phoneTrimmed),
    staleTime: 30_000,
  });
  const alreadyConsented = consentQuery.data?.smsConsented === true;
  const needsSmsOptIn = smsRemindersEnabled && phoneTrimmed.length > 0 && !alreadyConsented;

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
  const pathBookingOff =
    !slugOverride && org?.bookingSite?.pathBookingEnabled === false;
  if (!org || !org.publicBookingEnabled || pathBookingOff) {
    return (
      <BookingPublicShell showPoweredBy>
        {org ? (
          <PublicBookingSeo
            name={org.name}
            slug={org.slug}
            city={org.city}
            address={org.address}
            phone={org.phone}
            branding={org.bookingSite?.branding ?? null}
            indexable={false}
          />
        ) : (
          <PageSeo
            title="Booking unavailable"
            description="Online booking is not available for this business."
            path={slug ? `/book/${slug}` : '/'}
            robots="noindex,follow"
          />
        )}
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

  const seo = (
    <PublicBookingSeo
      name={org.name}
      slug={org.slug}
      city={org.city}
      address={org.address}
      phone={org.phone}
      branding={branding}
      indexable
    />
  );

  if (confirmed) {
    const manageUrl =
      managementToken && slug ? getManageBookingUrl(slug, managementToken) : null;

    return (
      <BookingPublicShell businessName={org.name} siteTemplate={siteTemplate} branding={branding}>
        {seo}
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className={cn('mb-4 h-14 w-14', theme.accent)} />
          <h1 className="text-xl font-bold text-neutral-900">You&apos;re booked!</h1>
          <p className="mt-2 text-sm text-neutral-600">{formatDateTime(slot!.startTime)}</p>
          {protectionCollected && protectionPolicy?.enabled ? (
            <p className="mt-2 max-w-sm text-sm text-neutral-600">
              {firstVisitConfirmCopy(protectionPolicy.mode, protectionPolicy.depositCents)}
            </p>
          ) : null}
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
      {seo}
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
          {protectionEnabled && protectionPolicy ? (
            <p className={cn('mb-4 text-sm', theme.mutedText)}>
              {firstVisitProtectionHeadline(protectionPolicy.mode, protectionPolicy.depositCents)}
            </p>
          ) : null}
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
            {needsSmsOptIn && (
              <div className="rounded-lg border border-stone-200 bg-white px-3 py-3">
                <SmsOptInCheckbox
                  brandName={org.name}
                  checked={smsOptIn}
                  onCheckedChange={setSmsOptIn}
                  lightOnly
                  textClassName="text-neutral-700"
                />
                {!smsSendingOn && (
                  <p className="mt-2 text-xs text-neutral-600">{SMS_UNDER_REVIEW_OPT_IN_NOTE}</p>
                )}
                {!smsOptIn && (
                  <p className="mt-2 text-xs text-red-600">
                    {smsSendingOn
                      ? 'Check the box to receive appointment texts, or leave phone blank.'
                      : 'Check the box to opt in for texts (they start after carrier approval), or leave phone blank.'}
                  </p>
                )}
              </div>
            )}
            {protectionEnabled && protectionPolicy && protectionQuery.data?.reason !== 'returning_client' ? (
              <FirstVisitProtectionCard
                mode={protectionQuery.data?.mode ?? protectionPolicy.mode}
                depositCents={protectionQuery.data?.depositCents ?? protectionPolicy.depositCents}
                theme={theme}
                session={cardSession}
                sessionError={
                  cardSessionError ??
                  (protectionQuery.error instanceof Error ? protectionQuery.error.message : null)
                }
                sessionLoading={identityReady && protectionQuery.isLoading}
                collectionReady={protectionPolicy.collectionReady}
              />
            ) : null}
            {protectionEnabled && !customer.email.trim() ? (
              <p className="text-xs text-red-600">Email is required so we can tell if this is a first visit.</p>
            ) : null}
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
              disabled={
                !customer.firstName ||
                !customer.lastName ||
                bookMutation.isPending ||
                confirmingCard ||
                (needsSmsOptIn && !smsOptIn) ||
                (protectionEnabled && !customer.email.trim()) ||
                (protectionEnabled && identityReady && protectionQuery.isLoading) ||
                Boolean(protectionQuery.data?.required && protectionQuery.data.stripe && !cardSession)
              }
              onClick={() => void submitBooking()}
              className={cn(
                'w-full rounded-full py-4 text-base font-semibold transition-colors disabled:opacity-40',
                theme.primaryBtn,
              )}
            >
              {bookMutation.isPending || confirmingCard
                ? protectionEnabled && protectionPolicy && (cardSession || protectionQuery.data?.required)
                  ? firstVisitBookLabel(protectionPolicy.mode, protectionPolicy.depositCents, true)
                  : 'Booking…'
                : protectionEnabled && protectionPolicy && (cardSession || protectionQuery.data?.required)
                  ? firstVisitBookLabel(
                      protectionQuery.data?.mode ?? protectionPolicy.mode,
                      protectionQuery.data?.depositCents ?? protectionPolicy.depositCents,
                    )
                  : 'Book appointment'}
            </button>
          </BookingStickyAction>
        </>
      )}
    </BookingPublicShell>
  );
}
