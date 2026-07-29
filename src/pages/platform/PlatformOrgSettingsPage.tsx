import { Navigate, useParams } from 'react-router-dom';
import { OrganizationSettingsSection } from '@/components/settings/OrganizationSettingsSection';
import { PlatformAdminSection } from '@/components/settings/PlatformAdminSection';
import { PlatformOrgBillingSection } from '@/components/settings/PlatformOrgBillingSection';
import { PlatformOrgDangerSection } from '@/components/settings/PlatformOrgDangerSection';

export function PlatformOrgSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();

  if (!orgId) return <Navigate to="/platform/organizations" replace />;

  return (
    <div className="max-w-xl space-y-6">
      <OrganizationSettingsSection orgId={orgId} />
      <PlatformAdminSection orgId={orgId} />
      <PlatformOrgBillingSection orgId={orgId} />
      <PlatformOrgDangerSection orgId={orgId} />
    </div>
  );
}
