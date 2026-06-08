import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { orgApi, ownerApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { OrganizationSettingsSection } from '@/components/settings/OrganizationSettingsSection';
import { WebsiteSettingsSection } from '@/components/settings/WebsiteSettingsSection';
import { PlatformAdminSection } from '@/components/settings/PlatformAdminSection';
import { Card, CardContent } from '@/components/ui/card';

export function OrgSettingsPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const isPlatformOwner = user?.role === 'platform_owner';
  const isOrgOwner = user?.role === 'org_owner';

  const { data: orgData } = useQuery({
    queryKey: ['organization', orgId, user?.role],
    queryFn: () =>
      isPlatformOwner ? ownerApi.getOrganization(orgId!) : orgApi.getOrganization(orgId!),
    enabled: !!orgId && (isPlatformOwner || isOrgOwner),
  });

  if (!isPlatformOwner && !isOrgOwner) {
    return (
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <p className="text-sm text-stone-500">
            Organization settings are only available to organization owners.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!orgId) return <Navigate to="/" replace />;

  const publicBookingEnabled = orgData?.organization.publicBookingEnabled ?? false;

  return (
    <div className="max-w-xl space-y-6">
      <OrganizationSettingsSection orgId={orgId} />
      {publicBookingEnabled && <WebsiteSettingsSection orgId={orgId} />}
      {isPlatformOwner && <PlatformAdminSection orgId={orgId} />}
    </div>
  );
}
