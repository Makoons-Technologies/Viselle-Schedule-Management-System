import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { orgApi } from '@/lib/api';
import { isOrgTrialExpired } from '@/lib/trial';

/**
 * True when the signed-in org_owner/staff user's organization trial has
 * expired and org-mutating UI should be locked down (view-only). Uses the
 * same query key/shape as OrgTrialBanner and Topbar so it reads from the
 * same cache entry instead of firing an extra request.
 *
 * Platform owners are never locked by this hook, even when viewing an org's
 * pages (e.g. /platform/orgs/:id) — they may still need to manage that org.
 * The read-only warning shown to platform owners in that case lives in
 * OrgTrialBanner instead.
 */
export function useOrgTrialExpired(): boolean {
  const { user } = useAuth();
  const routeOrgId = useOrgId();
  const isPlatformOwner = user?.role === 'platform_owner';
  const orgIdForQuery = isPlatformOwner ? routeOrgId : user?.organizationId ?? routeOrgId;

  const { data } = useQuery({
    queryKey: ['organization', orgIdForQuery, user?.role],
    queryFn: () => orgApi.getOrganization(orgIdForQuery!),
    enabled: !!orgIdForQuery && !isPlatformOwner,
  });

  if (isPlatformOwner) return false;
  return isOrgTrialExpired(data?.organization);
}
