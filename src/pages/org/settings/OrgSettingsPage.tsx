import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { OrganizationSettingsSection } from '@/components/settings/OrganizationSettingsSection';

export function OrgSettingsPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const isOrgOwner = user?.role === 'org_owner';
  const isPlatformOwner = user?.role === 'platform_owner';
  const canAccess = isOrgOwner || isPlatformOwner;

  if (!canAccess) {
    return <Navigate to={`/orgs/${orgId}/dashboard`} replace />;
  }

  if (!orgId) return <Navigate to="/" replace />;

  return (
    <div className="max-w-xl space-y-6">
      <OrganizationSettingsSection orgId={orgId} />
    </div>
  );
}
