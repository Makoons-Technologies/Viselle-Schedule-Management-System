import { shouldOmitAuthHeader } from '@/lib/api';
import { isPublicPathBookingOpen, readPublicOrganization } from '@/lib/public-booking';
import { publicBookingLockReason, PUBLIC_BOOKING_UNAVAILABLE_MESSAGE } from '@/lib/trial';

/**
 * BEA-65: Isolation /book looked unavailable while logged in because the
 * session JWT was sent as a public API key. Keep catalog calls keyless.
 */
function assertPublicBookingAuthFixtures(): void {
  const isolationSlug = '/public/organizations/grokbot-isolation-studio';
  const isolationUuid = '/public/organizations/aaaaaaaa-0000-4000-8000-000000000010';

  if (!shouldOmitAuthHeader(isolationSlug)) {
    throw new Error('public org-by-slug must not send a session JWT');
  }
  if (!shouldOmitAuthHeader(isolationUuid)) {
    throw new Error('public org-by-UUID must not send a session JWT');
  }
  if (!shouldOmitAuthHeader(`${isolationSlug}/services`)) {
    throw new Error('public services must not send a session JWT');
  }
  if (
    !shouldOmitAuthHeader(
      'https://staging-api.viselle.net/api/v1/public/organizations/grokbot-isolation-studio',
    )
  ) {
    throw new Error('absolute public catalog URLs must not send a session JWT');
  }
  if (!shouldOmitAuthHeader('/auth/login')) {
    throw new Error('login must still omit leftover session tokens');
  }
  if (shouldOmitAuthHeader('/organizations/aaaaaaaa-0000-4000-8000-000000000010')) {
    throw new Error('owner org PATCH must still send the session JWT (BEA-63)');
  }
  if (shouldOmitAuthHeader('/organizations/aaaaaaaa-0000-4000-8000-000000000010/stripe-connect/status')) {
    throw new Error('Connect status reads must still send the session JWT');
  }

  if (
    publicBookingLockReason({ errorCode: 'FORBIDDEN' }) !== 'unavailable' ||
    PUBLIC_BOOKING_UNAVAILABLE_MESSAGE !== 'Online booking is not available for this business.'
  ) {
    throw new Error('public catalog 403 must keep the generic unavailable lock copy');
  }

  // Live staging-api shape (2026-08-23): nested envelope, not flat root fields.
  const isolationEnvelope = {
    organization: {
      id: 'aaaaaaaa-0000-4000-8000-000000000010',
      name: 'grokbot Isolation Studio',
      slug: 'grokbot-isolation-studio',
      publicBookingEnabled: true,
      city: 'Springfield',
      address: '100 Grokbot Isolation Ave',
      phone: '417-555-0100',
      smsRemindersEnabled: true,
      smsSendingEnabled: false,
      bookingSite: {
        hostingMode: 'path',
        siteTemplate: 'classic' as const,
        deploymentStatus: 'not_started',
        subdomain: null,
        branding: {},
        pathBookingEnabled: true,
      },
      firstVisitPayment: {
        mode: 'deposit' as const,
        depositCents: 100,
        required: true,
        stripeReady: true,
      },
    },
  };

  if ('publicBookingEnabled' in isolationEnvelope) {
    throw new Error('Isolation public org envelope must not expose flat publicBookingEnabled');
  }
  const isolationOrg = readPublicOrganization(isolationEnvelope);
  if (!isolationOrg?.publicBookingEnabled) {
    throw new Error('nested Isolation { organization } must unwrap to publicBookingEnabled');
  }
  if (isolationOrg.bookingSite?.pathBookingEnabled !== true) {
    throw new Error('nested Isolation pathBookingEnabled must survive unwrap');
  }
  if (isolationOrg.firstVisitPayment?.depositCents !== 100) {
    throw new Error('nested Isolation first-visit $1 must survive unwrap (BEA-63)');
  }
  if (!isPublicPathBookingOpen(isolationOrg)) {
    throw new Error('Isolation nested envelope must open /book for slug and UUID');
  }
  if (!readPublicOrganization({ organization: isolationOrg })?.publicBookingEnabled) {
    throw new Error('client { organization } wrap must still unwrap');
  }
  if (readPublicOrganization(isolationOrg)?.publicBookingEnabled !== true) {
    throw new Error('already-flat public org must still read publicBookingEnabled');
  }
}

assertPublicBookingAuthFixtures();
