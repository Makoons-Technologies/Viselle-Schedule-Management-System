import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useOrgCanceled } from '@/hooks/useOrgCanceled';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgProductClosed } from '@/hooks/useOrgProductClosed';
import { useOrgTrialExpired } from '@/hooks/useOrgTrialExpired';
import {
  isOrgBillingReactivatePath,
  ORG_CANCELED_MESSAGE,
  ORG_CANCELED_STAFF_MESSAGE,
  orgCanceledRedirectPath,
  TRIAL_EXPIRED_MESSAGE,
  TRIAL_EXPIRED_STAFF_MESSAGE,
} from '@/lib/trial';

/**
 * Closes salon ops when billing is hard-canceled or the trial expire-job
 * has fired. Plan / account / billing stay reachable so the owner can
 * reactivate or upgrade. Copy is canceled vs expired, not one banner for both.
 *
 * Anyone in the salon product shell (`/orgs/:orgId/...`) is redirected,
 * including platform_owner via Open salon. Dedicated `/platform/orgs/:orgId`
 * inspect pages are outside this guard.
 */
export function CanceledOrgGuard() {
  const { user } = useAuth();
  const productClosed = useOrgProductClosed();
  const canceled = useOrgCanceled();
  const trialExpired = useOrgTrialExpired();
  const orgId = useOrgId();
  const location = useLocation();
  const warned = useRef(false);

  const allowed = !!orgId && isOrgBillingReactivatePath(location.pathname, orgId);
  const shouldRedirect = productClosed && !!orgId && !allowed;

  useEffect(() => {
    if (shouldRedirect && !warned.current) {
      warned.current = true;
      if (canceled) {
        toast.message(user?.role === 'staff' ? ORG_CANCELED_STAFF_MESSAGE : ORG_CANCELED_MESSAGE);
      } else if (trialExpired) {
        toast.message(user?.role === 'staff' ? TRIAL_EXPIRED_STAFF_MESSAGE : TRIAL_EXPIRED_MESSAGE);
      }
    }
  }, [shouldRedirect, canceled, trialExpired, user?.role]);

  if (shouldRedirect) {
    return <Navigate to={orgCanceledRedirectPath(orgId, user?.role)} replace />;
  }

  return <Outlet />;
}
