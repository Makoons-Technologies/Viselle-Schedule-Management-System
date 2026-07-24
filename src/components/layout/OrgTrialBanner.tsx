import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { useOrgId } from '@/hooks/useOrgId';
import { orgApi } from '@/lib/api';
import { isOrgTrialExpired } from '@/lib/trial';
import { getPlatformContextFromPath, PLATFORM_CONTEXT } from '@/components/layout/platform-navigation';
import { TrialExpiredBanner } from '@/components/common/TrialExpiredBanner';

/**
 * Persistent red banner shown on every page within an org's context — the org's
 * own dashboard/calendar/etc. for org_owner and staff, and the platform admin's
 * per-org pages when viewing that org. Uses the same query key as Topbar's
 * organization fetch so no extra network requests are made.
 */
export function OrgTrialBanner() {
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

  if (!organization || !isOrgTrialExpired(organization)) return null;

  return <TrialExpiredBanner organization={organization} isPlatformOwner={isPlatformOwner} />;
}
