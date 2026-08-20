import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useOrgCanceled } from '@/hooks/useOrgCanceled';
import { useOrgId } from '@/hooks/useOrgId';
import { orgApi } from '@/lib/api';
import { ORG_CANCELED_STAFF_MESSAGE } from '@/lib/trial';
import { AddToHomeScreenCard } from '@/components/settings/AddToHomeScreenCard';
import { OrgDangerZone } from '@/components/settings/OrgDangerZone';
import { PushNotificationsCard } from '@/components/settings/PushNotificationsCard';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { LoadingState } from '@/components/common/LoadingState';

/** Staff (and owners) account/membership danger zone — leave or delete. */
export function AccountSettingsPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const canceled = useOrgCanceled();

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
    canceled
      ? undefined
      : user?.role === 'staff'
        ? `/orgs/${orgId}/calendar`
        : `/orgs/${orgId}/settings`;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {backTo ? (
        <SettingsBackHeader title="Account" backTo={backTo} />
      ) : (
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Account</h1>
      )}
      {canceled && user?.role === 'staff' && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
          {ORG_CANCELED_STAFF_MESSAGE}
        </div>
      )}
      <p className={backTo ? '-mt-2 text-sm text-stone-600 dark:text-stone-400' : 'text-sm text-stone-600 dark:text-stone-400'}>
        Manage your membership in {data?.organization.name ?? 'this organization'}.
      </p>
      <AddToHomeScreenCard />
      {user?.role === 'staff' ? <PushNotificationsCard /> : null}
      <OrgDangerZone orgId={orgId} orgName={data?.organization.name} />
    </div>
  );
}
