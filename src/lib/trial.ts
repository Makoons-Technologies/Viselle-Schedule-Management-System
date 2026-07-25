import type { Organization } from '@/types/api';

type TrialOrgFields = Pick<Organization, 'trialEndsAt' | 'status' | 'billingStatus'>;

/**
 * Mirrors the backend's isOrgTrialExpired check (see active-org.middleware.ts):
 * only true for the exact soft-lock state the expire-trials job writes
 * (status: 'inactive', billingStatus: 'cancelled', trialEndsAt in the past).
 */
export function isOrgTrialExpired(org: TrialOrgFields | null | undefined): boolean {
  if (!org?.trialEndsAt) return false;
  if (org.status !== 'inactive' || org.billingStatus !== 'cancelled') return false;
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

/** Tooltip/title text shown on controls locked by an expired trial. */
export const TRIAL_LOCKED_MESSAGE = 'Trial expired — upgrade to make changes';

/** Toast shown when navigation into a Settings-area route is blocked by an expired trial. */
export const TRIAL_SETTINGS_LOCKED_MESSAGE = 'Trial expired — upgrade to access Settings';

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
