import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { orgApi } from '@/lib/api';
import { OrganizationSettingsSection } from '@/components/settings/OrganizationSettingsSection';
import { OrgDangerZone } from '@/components/settings/OrgDangerZone';

export function OrgSettingsPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const isOrgOwner = user?.role === 'org_owner';
  const isPlatformOwner = user?.role === 'platform_owner';
  const canAccess = isOrgOwner || isPlatformOwner;

  const { data } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => orgApi.getOrganization(orgId!),
    enabled: !!orgId && canAccess,
  });

  if (!canAccess) {
    return <Navigate to={`/orgs/${orgId}/dashboard`} replace />;
  }

  if (!orgId) return <Navigate to="/" replace />;

  return (
    <div className="max-w-xl space-y-6">
      <OrganizationSettingsSection orgId={orgId} />
      {isOrgOwner ? <OrgDangerZone orgId={orgId} orgName={data?.organization.name} /> : null}
    </div>
  );
}
