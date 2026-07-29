import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { orgApi } from '@/lib/api';
import { orgMustChoosePlan } from '@/lib/trial';
import { getPlatformContextFromPath, PLATFORM_CONTEXT } from '@/components/layout/platform-navigation';

/**
 * True when the current org is not on an active trial and has no Stripe
 * subscription linked — org owners must subscribe before using the app.
 *
 * Platform owners on dedicated `/platform/...` admin routes are never gated.
 * When a platform owner views salon ops (`/orgs/...`), this still reports the
 * org's gate state for banners, but write locks / hard redirects treat
 * platform_owner separately.
 */
export function useOrgMustChoosePlan(): boolean {
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

  const { plan } = useOrgPlan(orgIdForQuery ?? undefined);

  if (isPlatformOwner) {
    const contextValue = getPlatformContextFromPath(location.pathname);
    if (!contextValue || contextValue === PLATFORM_CONTEXT) return false;
    const organization = organizations.find((o) => o.id === contextValue) ?? selectedOrg;
    return orgMustChoosePlan(organization, plan?.hasStripeSubscription);
  }

  return orgMustChoosePlan(data?.organization, plan?.hasStripeSubscription);
}
