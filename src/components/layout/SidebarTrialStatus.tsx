import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { useOrgId } from '@/hooks/useOrgId';
import { orgApi } from '@/lib/api';
import {
  formatTrialCountdown,
  getTrialRemainingParts,
  isOrgInActiveTrial,
  isOrgTrialExpired,
} from '@/lib/trial';
import { getPlatformContextFromPath, PLATFORM_CONTEXT } from '@/components/layout/platform-navigation';

/**
 * Compact trial label under the Viselle brand in the sidebar.
 * Live countdown while the org is on an active trial; "Trial expired" when soft-locked.
 * Shares the organization query key with OrgTrialBanner / Topbar.
 */
export function SidebarTrialStatus() {
  const { user } = useAuth();
  const location = useLocation();
  const { organizations, selectedOrg } = useOrg();
  const routeOrgId = useOrgId();
  const isPlatformOwner = user?.role === 'platform_owner';
  const orgIdForQuery = isPlatformOwner ? routeOrgId : user?.organizationId ?? routeOrgId;

  const { data: orgData } = useQuery({
    queryKey: ['organization', orgIdForQuery, user?.role],
    queryFn: () => orgApi.getOrganization(orgIdForQuery!),
    enabled: !!orgIdForQuery && !isPlatformOwner,
  });

  const contextValue = isPlatformOwner ? getPlatformContextFromPath(location.pathname) : null;
  const selectedOrgFromContext =
    contextValue && contextValue !== PLATFORM_CONTEXT
      ? organizations.find((o) => o.id === contextValue) ?? selectedOrg
      : null;

  const organization = isPlatformOwner ? selectedOrgFromContext : orgData?.organization ?? null;

  const endsAt = organization?.trialEndsAt ?? null;
  const active = !!organization && isOrgInActiveTrial(organization) && !!endsAt;
  const expired = !!organization && isOrgTrialExpired(organization);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !endsAt) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active, endsAt]);

  if (!organization) return null;

  if (expired) {
    return (
      <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400" aria-live="polite">
        Trial expired
      </p>
    );
  }

  if (!active || !endsAt) return null;

  const countdown = formatTrialCountdown(getTrialRemainingParts(endsAt, nowMs));

  return (
    <p
      className="mt-1 text-xs tabular-nums text-amber-700 dark:text-amber-400"
      aria-live="polite"
      title={`Free trial ends in ${countdown}`}
    >
      <span className="font-medium">Trial</span>
      <span className="text-amber-800/80 dark:text-amber-300/90"> · {countdown}</span>
    </p>
  );
}
