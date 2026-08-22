import type { Organization } from '@/types/api';

type TrialOrgFields = Pick<Organization, 'trialEndsAt' | 'status' | 'billingStatus' | 'isDev'>;

function isCanceledLabel(value: string | null | undefined): boolean {
  return value === 'cancelled' || value === 'canceled';
}

/**
 * Mirrors the backend's isOrgTrialExpired check (see active-org.middleware.ts):
 * only true for the exact soft-lock state the expire-trials job writes
 * (status: 'inactive', billingStatus: 'cancelled', trialEndsAt in the past).
 */
export function isOrgTrialExpired(org: Partial<TrialOrgFields> | null | undefined): boolean {
  if (!org?.trialEndsAt) return false;
  if (org.status !== 'inactive' || !isCanceledLabel(org.billingStatus)) return false;
  return new Date(org.trialEndsAt).getTime() <= Date.now();
}

/**
 * Mirrors backend isOrgInActiveTrial (effective-settings.ts): org is on trial
 * status/billing and trialEndsAt is still in the future (or unset).
 */
export function isOrgInActiveTrial(org: TrialOrgFields | null | undefined): boolean {
  if (!org) return false;
  if (org.status !== 'trial' && org.billingStatus !== 'trial') return false;
  if (org.trialEndsAt && new Date(org.trialEndsAt).getTime() <= Date.now()) return false;
  return true;
}

/**
 * True when the org must subscribe via Stripe Checkout before using the app:
 * not in an active trial, and no platform SaaS Stripe subscription linked.
 * Mirrors backend `orgMustChoosePlan` / Plan settings `hasStripeSubscription`.
 *
 * Canceled orgs are handled separately (`isOrgCanceled`) so isDev grokbot
 * shops and leftover Stripe subscription ids cannot keep the product open.
 */
export function orgMustChoosePlan(
  org: TrialOrgFields | null | undefined,
  hasStripeSubscription: boolean | null | undefined,
): boolean {
  if (!org) return false;
  if (isOrgCanceled(org)) return false;
  if (org.isDev) return false;
  if (hasStripeSubscription) return false;
  return !isOrgInActiveTrial(org);
}

/**
 * Hard-canceled billing, not the expire-job shape.
 *
 * Canceled label on staging is `organizations.billing_status = 'cancelled'`
 * (two L's). Org `status` can still be `active`. Product closed; Plan/Account
 * stay open to reactivate. Applies to isDev grokbot shops too.
 *
 * Expire-job orgs also have cancelled billing (`inactive` + past trialEndsAt).
 * Those are `isOrgTrialExpired`, not canceled — Joseph wants trial / expired /
 * canceled as separate states (BEA-44).
 */
export function isOrgCanceled(org: TrialOrgFields | null | undefined): boolean {
  if (!org) return false;
  if (isOrgTrialExpired(org)) return false;
  return org.billingStatus === 'cancelled';
}

/**
 * Product shell should collapse to Plan / Account: hard-canceled or expire-job.
 * Distinct copy still comes from isOrgCanceled vs isOrgTrialExpired.
 */
export function isOrgProductClosed(org: TrialOrgFields | null | undefined): boolean {
  return isOrgCanceled(org) || isOrgTrialExpired(org);
}

/** Plan / account / billing paths that stay open when the product shell is closed. */
export function isOrgBillingReactivatePath(pathname: string, orgId: string): boolean {
  const orgBase = `/orgs/${orgId}`;
  if (pathname === `${orgBase}/settings/plan`) return true;
  if (pathname.startsWith(`${orgBase}/settings/plan?`)) return true;
  if (pathname === `${orgBase}/settings/account`) return true;
  if (pathname.startsWith(`${orgBase}/settings/account/`)) return true;
  if (pathname === `${orgBase}/billing`) return true;
  return false;
}

export function orgCanceledRedirectPath(orgId: string, role: string | undefined): string {
  if (role === 'staff') return `/orgs/${orgId}/settings/account`;
  return `/orgs/${orgId}/settings/plan`;
}

/**
 * Salon-shell entry for platform "Open salon" (and similar). Canceled billing
 * lands on Plan; everyone else still opens the dashboard. Gate is
 * billingStatus === 'cancelled' only — not org status or name.
 */
export function orgSalonEntryPath(
  orgId: string,
  billingStatus: Organization['billingStatus'] | null | undefined,
): string {
  if (billingStatus === 'cancelled') return orgCanceledRedirectPath(orgId, 'org_owner');
  return `/orgs/${orgId}/dashboard`;
}

export interface TrialRemainingParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

/** Break remaining ms into Dd / Hh / Mm / Ss parts (floored, never negative). */
export function getTrialRemainingParts(trialEndsAt: string, nowMs = Date.now()): TrialRemainingParts {
  const totalMs = Math.max(0, new Date(trialEndsAt).getTime() - nowMs);
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalMs };
}

/** Compact live countdown label, e.g. "3d 12h 5m 30s". */
export function formatTrialCountdown(parts: TrialRemainingParts): string {
  return `${parts.days}d ${parts.hours}h ${parts.minutes}m ${parts.seconds}s`;
}

/** Tooltip/title text shown on controls locked by expired trial or missing plan. */
export const TRIAL_LOCKED_MESSAGE = 'Subscribe or upgrade to make changes';

/** Toast shown when navigation into a Settings-area route is blocked by an expired trial. */
export const TRIAL_SETTINGS_LOCKED_MESSAGE = 'Trial expired — upgrade to access Settings';

/** Toast / copy when the org must pick a paid plan before using the app. */
export const PLAN_REQUIRED_MESSAGE = 'Choose a plan to continue to use Viselle.';

/** Toast / copy when the org is canceled and the product shell is closed. */
export const ORG_CANCELED_MESSAGE = 'This organization is canceled. Subscribe to reactivate.';

export const ORG_CANCELED_STAFF_MESSAGE =
  'This organization is canceled. Ask the owner to reactivate billing.';

/** In-app / Plan copy when the expire-job lock is on (not canceled). */
export const TRIAL_EXPIRED_MESSAGE = 'Your trial has expired. Upgrade to continue using Viselle.';

export const TRIAL_EXPIRED_STAFF_MESSAGE =
  'This organization trial has expired. Ask the owner to upgrade.';

/** Public /book lock for canceled, disabled, or missing shops. */
export const PUBLIC_BOOKING_UNAVAILABLE_MESSAGE =
  'Online booking is not available for this business.';

/** Public /book lock for expire-job shops — same lock chrome, expired copy. */
export const PUBLIC_BOOKING_TRIAL_EXPIRED_MESSAGE =
  'This business’s trial has expired. Online booking is not available.';

export type PublicBookingLockReason = 'expired' | 'unavailable';

/**
 * Canceled / disabled / missing shops stay on the generic lock.
 * Expire-job uses TRIAL_EXPIRED (API) or the expire-job org shape.
 */
export function publicBookingLockReason(input: {
  errorCode?: string | null;
  organization?: Partial<TrialOrgFields> | null;
}): PublicBookingLockReason {
  if (input.errorCode === 'TRIAL_EXPIRED') return 'expired';
  if (isOrgTrialExpired(input.organization)) return 'expired';
  return 'unavailable';
}

export function publicBookingLockMessage(reason: PublicBookingLockReason): string {
  return reason === 'expired'
    ? PUBLIC_BOOKING_TRIAL_EXPIRED_MESSAGE
    : PUBLIC_BOOKING_UNAVAILABLE_MESSAGE;
}

/**
 * Spread onto a `<Button>` (or other control) to lock it down when the
 * org's trial has expired: disables it and adds an explanatory title
 * tooltip, without touching any existing `disabled`/`title` logic — merge
 * the return value's fields with your own conditions with `||`/`??`.
 */
export function trialLockProps(trialExpired: boolean): { disabled: boolean; title: string | undefined } {
  return {
    disabled: trialExpired,
    title: trialExpired ? TRIAL_LOCKED_MESSAGE : undefined,
  };
}
