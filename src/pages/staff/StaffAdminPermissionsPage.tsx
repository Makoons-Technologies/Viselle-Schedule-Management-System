import { Navigate } from 'react-router-dom';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { StaffPermissionsSection } from '@/components/settings/StaffPermissionsSection';
import { useAuth } from '@/context/AuthContext';
import { useOrgAdminAccess } from '@/hooks/useOrgAdminAccess';

export function StaffAdminPermissionsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? '';
  const canAccess = useOrgAdminAccess(orgId);

  if (!canAccess) {
    return <Navigate to={`/orgs/${orgId}/calendar`} replace />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SettingsBackHeader title="Staff permissions" backTo={`/orgs/${orgId}/calendar`} />
      <StaffPermissionsSection orgId={orgId} />
    </div>
  );
}
