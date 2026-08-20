import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useOrgCanceled } from '@/hooks/useOrgCanceled';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgTrialExpired } from '@/hooks/useOrgTrialExpired';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import {
  ORG_CANCELED_MESSAGE,
  ORG_CANCELED_STAFF_MESSAGE,
  orgCanceledRedirectPath,
  PLAN_REQUIRED_MESSAGE,
  TRIAL_SETTINGS_LOCKED_MESSAGE,
} from '@/lib/trial';

/**
 * Blocks navigation into org Settings-area routes (hub + detail pages, Staff /
 * Availability / Booking website, staff permissions) when the org is write-locked
 * (expired trial, canceled, or unpaid / no Stripe plan for org_owner/staff).
 *
 * Plan settings (`settings/plan`) and Account are routed outside this guard so
 * upgrade / subscribe / reactivate stays reachable. Platform owners are not
 * plan-gated by useOrgWriteLocked; canceled still write-locks them.
 */
export function TrialSettingsGuard() {
  const { user } = useAuth();
  const writeLocked = useOrgWriteLocked();
  const trialExpired = useOrgTrialExpired();
  const canceled = useOrgCanceled();
  const orgId = useOrgId();
  const warned = useRef(false);

  useEffect(() => {
    if (writeLocked && !warned.current) {
      warned.current = true;
      if (canceled) {
        toast.error(user?.role === 'staff' ? ORG_CANCELED_STAFF_MESSAGE : ORG_CANCELED_MESSAGE);
      } else {
        toast.error(trialExpired ? TRIAL_SETTINGS_LOCKED_MESSAGE : PLAN_REQUIRED_MESSAGE);
      }
    }
  }, [writeLocked, trialExpired, canceled, user?.role]);

  if (writeLocked) {
    if (!orgId) return null;
    if (canceled && user?.role !== 'platform_owner') {
      return <Navigate to={orgCanceledRedirectPath(orgId, user?.role)} replace />;
    }
    return <Navigate to={`/orgs/${orgId}/dashboard`} replace />;
  }

  return <Outlet />;
}
