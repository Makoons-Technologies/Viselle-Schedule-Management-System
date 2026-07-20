import { StaffPermissionsSection } from '@/components/settings/StaffPermissionsSection';
import { useOrgId } from '@/hooks/useOrgId';

export function StaffPermissionsSettingsPage() {
  const orgId = useOrgId();
  return <StaffPermissionsSection orgId={orgId} />;
}
