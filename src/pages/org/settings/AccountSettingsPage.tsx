import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { orgApi } from '@/lib/api';
import { OrgDangerZone } from '@/components/settings/OrgDangerZone';
import { PushNotificationsCard } from '@/components/settings/PushNotificationsCard';
import { LoadingState } from '@/components/common/LoadingState';

/** Staff (and owners) account/membership danger zone — leave or delete. */
export function AccountSettingsPage() {
  const orgId = useOrgId();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => orgApi.getOrganization(orgId!),
    enabled: !!orgId && user?.role !== 'platform_owner',
  });

  if (!orgId) return <Navigate to="/" replace />;
  if (user?.role === 'platform_owner') {
    return <Navigate to={`/orgs/${orgId}/dashboard`} replace />;
  }

  if (isLoading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Account</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Manage your membership in {data?.organization.name ?? 'this organization'}.
        </p>
      </div>
      <PushNotificationsCard />
      <OrgDangerZone orgId={orgId} orgName={data?.organization.name} />
    </div>
  );
}
