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
