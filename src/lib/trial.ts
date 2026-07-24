import type { Organization } from '@/types/api';

/**
 * Mirrors the backend's isOrgTrialExpired check (see active-org.middleware.ts):
 * only true for the exact soft-lock state the expire-trials job writes
 * (status: 'inactive', billingStatus: 'cancelled', trialEndsAt in the past).
 */
export function isOrgTrialExpired(
  org: Pick<Organization, 'trialEndsAt' | 'status' | 'billingStatus'> | null | undefined,
): boolean {
  if (!org?.trialEndsAt) return false;
  if (org.status !== 'inactive' || org.billingStatus !== 'cancelled') return false;
  return new Date(org.trialEndsAt).getTime() <= Date.now();
}

/** Tooltip/title text shown on controls locked by an expired trial. */
export const TRIAL_LOCKED_MESSAGE = 'Trial expired — upgrade to make changes';

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
