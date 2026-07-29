import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgMustChoosePlan } from '@/hooks/useOrgMustChoosePlan';
import { PLAN_REQUIRED_MESSAGE } from '@/lib/trial';

function isPlanGateAllowedPath(pathname: string, orgId: string): boolean {
  const orgBase = `/orgs/${orgId}`;
  if (pathname === `${orgBase}/settings/plan`) return true;
  if (pathname.startsWith(`${orgBase}/settings/plan?`)) return true;
  if (pathname === `${orgBase}/settings/account`) return true;
  if (pathname.startsWith(`${orgBase}/settings/account/`)) return true;
  if (pathname === `${orgBase}/billing`) return true;
  return false;
}

/**
 * Forces org_owners whose org is not on trial and has no Stripe subscription
 * onto Plan settings (Checkout). Staff keep read access (soft-locked elsewhere).
 * Platform owners are never hard-redirected. Support routes live outside /orgs.
 */
export function PlanRequiredGuard() {
  const { user } = useAuth();
  const mustChoosePlan = useOrgMustChoosePlan();
  const orgId = useOrgId();
  const location = useLocation();
  const warned = useRef(false);

  const shouldRedirect =
    mustChoosePlan &&
    user?.role === 'org_owner' &&
    !!orgId &&
    !isPlanGateAllowedPath(location.pathname, orgId);

  useEffect(() => {
    if (shouldRedirect && !warned.current) {
      warned.current = true;
      toast.message(PLAN_REQUIRED_MESSAGE);
    }
  }, [shouldRedirect]);

  if (shouldRedirect) {
    return <Navigate to={`/orgs/${orgId}/settings/plan`} replace />;
  }

  return <Outlet />;
}
