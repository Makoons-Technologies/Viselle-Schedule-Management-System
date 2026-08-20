import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { useOrgId } from '@/hooks/useOrgId';
import { orgApi } from '@/lib/api';
import { isOrgCanceled } from '@/lib/trial';
import { getPlatformContextFromPath, PLATFORM_CONTEXT } from '@/components/layout/platform-navigation';

/**
 * True when the current org is hard-canceled (Canceled label), not expire-job.
 * Org status may still be active. Uses the same organization query cache as
 * trial/plan banners.
 *
 * Platform owners on dedicated `/platform/...` admin routes are never gated.
 * Salon ops (`/orgs/...`) report canceled billing for banners, write locks,
 * and the same Plan/Account hard-redirect as org owners.
 */
export function useOrgCanceled(): boolean {
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
    if (!contextValue || contextValue === PLATFORM_CONTEXT) return false;
    const organization = organizations.find((o) => o.id === contextValue) ?? selectedOrg;
    return isOrgCanceled(organization);
  }

  return isOrgCanceled(data?.organization);
}
