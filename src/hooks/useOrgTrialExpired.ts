import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { useOrgId } from '@/hooks/useOrgId';
import { orgApi } from '@/lib/api';
import { isOrgTrialExpired } from '@/lib/trial';
import { getPlatformContextFromPath, PLATFORM_CONTEXT } from '@/components/layout/platform-navigation';

/**
 * True when the current organization's trial has expired and org-mutating UI
 * should be locked down (view-only). Uses the same query key/shape as
 * OrgTrialBanner and Topbar so it reads from the same cache entry instead of
 * firing an extra request.
 *
 * Based on the org's trial/billing status — including when a platform_owner is
 * viewing that org's salon pages (calendar, appointments, etc.). Dedicated
 * platform admin routes (`/platform/orgs/:id/...`) do not use this hook for
 * their own mutation controls.
 */
export function useOrgTrialExpired(): boolean {
  const { user } = useAuth();
  const location = useLocation();
  const { organizations, selectedOrg } = useOrg();
  const routeOrgId = useOrgId();
  const isPlatformOwner = user?.role === 'platform_owner';
  const orgIdForQuery = isPlatformOwner ? routeOrgId : user?.organizationId ?? routeOrgId;

  const { data } = useQuery({
    queryKey: ['organization', orgIdForQuery, user?.role],
    queryFn: () => orgApi.getOrganization(orgIdForQuery!),
    enabled: !!orgIdForQuery && !isPlatformOwner,
  });

  if (isPlatformOwner) {
    const contextValue = getPlatformContextFromPath(location.pathname);
    const organization =
      contextValue && contextValue !== PLATFORM_CONTEXT
        ? organizations.find((o) => o.id === contextValue) ?? selectedOrg
        : null;
    return isOrgTrialExpired(organization);
  }

  return isOrgTrialExpired(data?.organization);
}
