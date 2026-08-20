import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useOrgCanceled } from '@/hooks/useOrgCanceled';
import { useOrgId } from '@/hooks/useOrgId';
import {
  isOrgBillingReactivatePath,
  ORG_CANCELED_MESSAGE,
  ORG_CANCELED_STAFF_MESSAGE,
  orgCanceledRedirectPath,
} from '@/lib/trial';

/**
 * Closes salon ops when billing status is cancelled. Plan / account /
 * billing stay reachable so the owner can reactivate. Platform owners are
 * not hard-redirected (write-lock still applies on salon pages).
 */
export function CanceledOrgGuard() {
  const { user } = useAuth();
  const canceled = useOrgCanceled();
  const orgId = useOrgId();
  const location = useLocation();
  const warned = useRef(false);

  const allowed = !!orgId && isOrgBillingReactivatePath(location.pathname, orgId);
  const shouldRedirect =
    canceled && user?.role !== 'platform_owner' && !!orgId && !allowed;

  useEffect(() => {
    if (shouldRedirect && !warned.current) {
      warned.current = true;
      toast.message(user?.role === 'staff' ? ORG_CANCELED_STAFF_MESSAGE : ORG_CANCELED_MESSAGE);
    }
  }, [shouldRedirect, user?.role]);

  if (shouldRedirect) {
    return <Navigate to={orgCanceledRedirectPath(orgId, user?.role)} replace />;
  }

  return <Outlet />;
}
