import { useQuery } from '@tanstack/react-query';
import { ApiError, isUnreachableRequestError, orgApi, ownerApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { isSmsSendingEnabled } from '@/lib/sms';
import type { OrgPlanFeatures } from '@/types/api';

function shouldRetryPlanFetch(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (isUnreachableRequestError(error)) return true;
  return error instanceof ApiError && error.status >= 500;
}

export function useOrgPlan(orgId: string | undefined) {
  const { user } = useAuth();
  const isPlatformOwner = user?.role === 'platform_owner';

  const orgPlanQuery = useQuery({
    queryKey: ['org-plan', orgId],
    queryFn: () => orgApi.getPlan(orgId!),
    enabled: !!orgId && !isPlatformOwner,
    retry: shouldRetryPlanFetch,
    retryDelay: 400,
  });

  const ownerSettingsQuery = useQuery({
    queryKey: ['owner-settings', orgId],
    queryFn: () => ownerApi.getSettings(orgId!),
    enabled: !!orgId && isPlatformOwner,
    retry: shouldRetryPlanFetch,
    retryDelay: 400,
    select: (data): { plan: OrgPlanFeatures } => ({
      plan: {
        subscriptionTier: data.settings.subscriptionTier ?? null,
        tierName:
          data.settings.subscriptionTier === 'starter'
            ? 'Starter'
            : data.settings.subscriptionTier === 'professional'
              ? 'Professional'
              : data.settings.subscriptionTier === 'business'
                ? 'Business'
                : 'Custom',
        smsRemindersEnabled: data.settings.smsRemindersEnabled,
        smsSendingEnabled: isSmsSendingEnabled({ smsSendingEnabled: data.smsSendingEnabled === true }),
        emailRemindersEnabled: data.settings.emailRemindersEnabled,
        recurringAppointmentsEnabled: data.settings.recurringAppointmentsEnabled,
        maxStaffAccounts: data.settings.maxStaffAccounts,
        monthlyPriceCents: data.settings.monthlyPriceCents,
        subdomainHostingEnabled: data.settings.subdomainHostingEnabled,
        hasStripeSubscription: Boolean(data.settings.stripeSubscriptionId),
      },
    }),
  });

  const query = isPlatformOwner ? ownerSettingsQuery : orgPlanQuery;
  const rawPlan = isPlatformOwner ? ownerSettingsQuery.data?.plan : orgPlanQuery.data?.plan;
  const plan = rawPlan
    ? { ...rawPlan, smsSendingEnabled: isSmsSendingEnabled(rawPlan) }
    : rawPlan;

  return {
    plan,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
