import { shouldOmitAuthHeader } from '@/lib/api';
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
}

assertPublicBookingAuthFixtures();
