import { typedDashboardPath, typedHoursPath } from '@/lib/auth-redirect';
import type { Organization } from '@/types/api';
import {
  isOrgBillingReactivatePath,
  isOrgCanceled,
  isOrgProductClosed,
  isOrgTrialExpired,
  orgCanceledRedirectPath,
  orgSalonEntryPath,
  publicBookingLockReason,
  PUBLIC_BOOKING_TRIAL_EXPIRED_MESSAGE,
  PUBLIC_BOOKING_UNAVAILABLE_MESSAGE,
} from '@/lib/trial';

type FixtureOrg = Pick<Organization, 'status' | 'billingStatus' | 'isDev' | 'trialEndsAt'>;

const ORG_ID = '00000000-0000-0000-0000-000000000210';

function org(overrides: Partial<FixtureOrg>): FixtureOrg {
  return {
    status: 'active',
    billingStatus: 'active',
    isDev: true,
    trialEndsAt: null,
    ...overrides,
  };
}

/**
 * Expected canceled-salon lockout. Gate is billingStatus === 'cancelled'
 * only — org status, isDev, and name are ignored. No live orgs.
 */
export const canceledSalonLockoutFixtures = [
  {
    name: 'canceled grokbot (active status) closes salon; Open salon → Plan',
    organization: org({ billingStatus: 'cancelled', status: 'active' }),
    canceled: true,
    expired: false,
    productClosed: true,
    openSalonPath: `/orgs/${ORG_ID}/settings/plan`,
    ownerRedirect: `/orgs/${ORG_ID}/settings/plan`,
    platformRedirect: `/orgs/${ORG_ID}/settings/plan`,
    staffRedirect: `/orgs/${ORG_ID}/settings/account`,
  },
  {
    name: 'active billing stays fully usable',
    organization: org({ billingStatus: 'active' }),
    canceled: false,
    expired: false,
    productClosed: false,
    openSalonPath: `/orgs/${ORG_ID}/dashboard`,
    ownerRedirect: `/orgs/${ORG_ID}/settings/plan`,
    platformRedirect: `/orgs/${ORG_ID}/settings/plan`,
    staffRedirect: `/orgs/${ORG_ID}/settings/account`,
  },
  {
    name: 'trial billing stays fully usable',
    organization: org({ billingStatus: 'trial', status: 'trial' }),
    canceled: false,
    expired: false,
    productClosed: false,
    openSalonPath: `/orgs/${ORG_ID}/dashboard`,
    ownerRedirect: `/orgs/${ORG_ID}/settings/plan`,
    platformRedirect: `/orgs/${ORG_ID}/settings/plan`,
    staffRedirect: `/orgs/${ORG_ID}/settings/account`,
  },
  {
    name: 'expire-job is expired, not canceled; Open salon still → Plan',
    organization: org({
      status: 'inactive',
      billingStatus: 'cancelled',
      trialEndsAt: '2020-01-01T00:00:00.000Z',
    }),
    canceled: false,
    expired: true,
    productClosed: true,
    openSalonPath: `/orgs/${ORG_ID}/settings/plan`,
    ownerRedirect: `/orgs/${ORG_ID}/settings/plan`,
    platformRedirect: `/orgs/${ORG_ID}/settings/plan`,
    staffRedirect: `/orgs/${ORG_ID}/settings/account`,
  },
] as const;

const allowedPaths = [
  `/orgs/${ORG_ID}/settings/plan`,
  `/orgs/${ORG_ID}/settings/account`,
  `/orgs/${ORG_ID}/billing`,
] as const;

const blockedSalonPaths = [
  `/orgs/${ORG_ID}/dashboard`,
  `/orgs/${ORG_ID}/calendar`,
  `/orgs/${ORG_ID}/appointments`,
  `/orgs/${ORG_ID}/customers`,
  `/orgs/${ORG_ID}/settings`,
  `/orgs/${ORG_ID}/settings/payments`,
] as const;

const platformInspectPath = `/platform/orgs/${ORG_ID}`;

/** Throws if lockout helpers drift from the BEA-42 contract. */
export function assertCanceledSalonLockoutFixtures(): void {
  for (const fixture of canceledSalonLockoutFixtures) {
    if (isOrgCanceled(fixture.organization) !== fixture.canceled) {
      throw new Error(`${fixture.name}: isOrgCanceled mismatch`);
    }
    if (isOrgTrialExpired(fixture.organization) !== fixture.expired) {
      throw new Error(`${fixture.name}: isOrgTrialExpired mismatch`);
    }
    if (isOrgProductClosed(fixture.organization) !== fixture.productClosed) {
      throw new Error(`${fixture.name}: isOrgProductClosed mismatch`);
    }
    if (orgSalonEntryPath(ORG_ID, fixture.organization.billingStatus) !== fixture.openSalonPath) {
      throw new Error(`${fixture.name}: orgSalonEntryPath mismatch`);
    }
    if (orgCanceledRedirectPath(ORG_ID, 'org_owner') !== fixture.ownerRedirect) {
      throw new Error(`${fixture.name}: owner redirect mismatch`);
    }
    if (orgCanceledRedirectPath(ORG_ID, 'platform_owner') !== fixture.platformRedirect) {
      throw new Error(`${fixture.name}: platform redirect mismatch`);
    }
    if (orgCanceledRedirectPath(ORG_ID, 'staff') !== fixture.staffRedirect) {
      throw new Error(`${fixture.name}: staff redirect mismatch`);
    }
  }

  for (const path of allowedPaths) {
    if (!isOrgBillingReactivatePath(path, ORG_ID)) {
      throw new Error(`expected billing/reactivate path: ${path}`);
    }
  }
  for (const path of blockedSalonPaths) {
    if (isOrgBillingReactivatePath(path, ORG_ID)) {
      throw new Error(`salon ops path must not stay open: ${path}`);
    }
  }
  if (isOrgBillingReactivatePath(platformInspectPath, ORG_ID)) {
    throw new Error('platform inspect is not a salon billing path');
  }

  const expiredOrg = org({
    status: 'inactive',
    billingStatus: 'cancelled',
    trialEndsAt: '2020-01-01T00:00:00.000Z',
  });
  if (publicBookingLockReason({ errorCode: 'TRIAL_EXPIRED' }) !== 'expired') {
    throw new Error('TRIAL_EXPIRED API code must lock as expired');
  }
  if (publicBookingLockReason({ organization: expiredOrg }) !== 'expired') {
    throw new Error('expire-job org shape must lock public book as expired');
  }
  if (publicBookingLockReason({ errorCode: 'ORG_CANCELLED' }) !== 'unavailable') {
    throw new Error('ORG_CANCELLED must keep the generic/canceled public lock');
  }
  if (String(PUBLIC_BOOKING_UNAVAILABLE_MESSAGE) === String(PUBLIC_BOOKING_TRIAL_EXPIRED_MESSAGE)) {
    throw new Error('expired and canceled public lock copy must differ');
  }
  if (!/expired/i.test(PUBLIC_BOOKING_TRIAL_EXPIRED_MESSAGE)) {
    throw new Error('expired public lock must say expired');
  }
  if (/canceled|cancelled/i.test(PUBLIC_BOOKING_TRIAL_EXPIRED_MESSAGE)) {
    throw new Error('expired public lock must not say canceled');
  }

  if (typedDashboardPath({ role: 'org_owner', organizationId: ORG_ID }) !== `/orgs/${ORG_ID}/dashboard`) {
    throw new Error('typed /dashboard must land on the org dashboard');
  }
  if (typedHoursPath({ role: 'org_owner', organizationId: ORG_ID }) !== `/orgs/${ORG_ID}/availability`) {
    throw new Error('typed /settings/hours must land on availability');
  }
  if (typedHoursPath({ role: 'staff', organizationId: ORG_ID }) !== '/staff/availability') {
    throw new Error('typed /settings/hours for staff must land on staff availability');
  }
  if (typedDashboardPath({ role: 'platform_owner', organizationId: null }) !== '/platform/dashboard') {
    throw new Error('typed /dashboard for platform must land on platform dashboard');
  }
}

assertCanceledSalonLockoutFixtures();
