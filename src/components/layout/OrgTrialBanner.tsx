import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { orgApi } from '@/lib/api';
import { isOrgCanceled, isOrgTrialExpired, orgMustChoosePlan } from '@/lib/trial';
import { getPlatformContextFromPath, PLATFORM_CONTEXT } from '@/components/layout/platform-navigation';
import { CanceledOrgBanner } from '@/components/common/CanceledOrgBanner';
import { TrialExpiredBanner } from '@/components/common/TrialExpiredBanner';
import { PlanRequiredBanner } from '@/components/common/PlanRequiredBanner';

/**
 * Persistent org billing/trial banners for the current org context.
 * Shares the organization query key with Topbar so no extra network requests
 * are made. Active-trial countdown lives in SidebarTrialStatus under the brand.
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

  const { plan } = useOrgPlan(orgIdForQuery ?? undefined);

  const contextValue = isPlatformOwner ? getPlatformContextFromPath(location.pathname) : null;
  const selectedOrgFromContext =
    contextValue && contextValue !== PLATFORM_CONTEXT
      ? organizations.find((o) => o.id === contextValue) ?? selectedOrg
      : null;

  const organization = isPlatformOwner ? selectedOrgFromContext : orgData?.organization ?? null;

  if (!organization) return null;

  if (isOrgCanceled(organization)) {
    return (
      <CanceledOrgBanner
        organization={organization}
        isStaff={user?.role === 'staff'}
        isPlatformOwner={isPlatformOwner}
      />
    );
  }

  if (isOrgTrialExpired(organization)) {
    return <TrialExpiredBanner organization={organization} isPlatformOwner={isPlatformOwner} />;
  }

  if (orgMustChoosePlan(organization, plan?.hasStripeSubscription)) {
    return (
      <PlanRequiredBanner
        organization={organization}
        isStaff={user?.role === 'staff'}
        isPlatformOwner={isPlatformOwner}
      />
    );
  }

  return null;
}
