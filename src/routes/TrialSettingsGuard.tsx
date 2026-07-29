import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgTrialExpired } from '@/hooks/useOrgTrialExpired';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { PLAN_REQUIRED_MESSAGE, TRIAL_SETTINGS_LOCKED_MESSAGE } from '@/lib/trial';

/**
 * Blocks navigation into org Settings-area routes (hub + detail pages, Staff /
 * Availability / Booking website, staff permissions) when the org is write-locked
 * (expired trial, or unpaid / no Stripe plan for org_owner/staff).
 *
 * Plan settings (`settings/plan`) and Account are routed outside this guard so
 * upgrade / subscribe stays reachable. Platform owners are not plan-gated by
 * useOrgWriteLocked.
 */
export function TrialSettingsGuard() {
  const writeLocked = useOrgWriteLocked();
  const trialExpired = useOrgTrialExpired();
  const orgId = useOrgId();
  const warned = useRef(false);

  useEffect(() => {
    if (writeLocked && !warned.current) {
      warned.current = true;
      toast.error(trialExpired ? TRIAL_SETTINGS_LOCKED_MESSAGE : PLAN_REQUIRED_MESSAGE);
    }
  }, [writeLocked, trialExpired]);

  if (writeLocked) {
    if (!orgId) return null;
    return <Navigate to={`/orgs/${orgId}/dashboard`} replace />;
  }

  return <Outlet />;
}
