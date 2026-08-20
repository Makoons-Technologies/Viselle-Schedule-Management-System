import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { orgApi } from '@/lib/api';
import { AddToHomeScreenCard } from '@/components/settings/AddToHomeScreenCard';
import { OrgDangerZone } from '@/components/settings/OrgDangerZone';
import { PushNotificationsCard } from '@/components/settings/PushNotificationsCard';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
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

  const backTo =
    user?.role === 'staff' ? `/orgs/${orgId}/calendar` : `/orgs/${orgId}/settings`;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <SettingsBackHeader title="Account" backTo={backTo} />
      <p className="-mt-2 text-sm text-stone-600 dark:text-stone-400">
        Manage your membership in {data?.organization.name ?? 'this organization'}.
      </p>
      <AddToHomeScreenCard />
      {user?.role === 'staff' ? <PushNotificationsCard /> : null}
      <OrgDangerZone orgId={orgId} orgName={data?.organization.name} />
    </div>
  );
}
