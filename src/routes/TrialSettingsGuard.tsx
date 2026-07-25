import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgTrialExpired } from '@/hooks/useOrgTrialExpired';
import { TRIAL_SETTINGS_LOCKED_MESSAGE } from '@/lib/trial';

/**
 * Blocks navigation into any org Settings-area route (the Settings hub and
 * its detail pages, plus Staff / Availability / Booking website, which the
 * Settings hub links out to, and the staff self-service permissions page)
 * once the org's trial has expired. Redirects to the org dashboard with a
 * toast instead of rendering the page.
 *
 * Works for routes both under /orgs/:orgId/... and outside it (e.g.
 * /staff/settings/staff-permissions) since useOrgId()/useOrgTrialExpired()
 * fall back to the signed-in user's own organization when there's no
 * :orgId route param.
 *
 * When a platform owner views an expired org via /orgs/:orgId/..., this guard
 * also blocks salon Settings — they should use dedicated platform admin routes
 * (/platform/orgs/:id/...) to manage that org instead.
 */
export function TrialSettingsGuard() {
  const trialExpired = useOrgTrialExpired();
  const orgId = useOrgId();
  const warned = useRef(false);

  useEffect(() => {
    if (trialExpired && !warned.current) {
      warned.current = true;
      toast.error(TRIAL_SETTINGS_LOCKED_MESSAGE);
    }
  }, [trialExpired]);

  if (trialExpired) {
    if (!orgId) return null;
    return <Navigate to={`/orgs/${orgId}/dashboard`} replace />;
  }

  return <Outlet />;
}
