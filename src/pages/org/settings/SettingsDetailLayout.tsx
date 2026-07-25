import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { useAuth } from '@/context/AuthContext';
import { useOrgAdminAccess } from '@/hooks/useOrgAdminAccess';
import { useOrgId } from '@/hooks/useOrgId';

const SETTINGS_TITLES: Record<string, string> = {
  general: 'General',
  plan: 'Plan',
  org: 'Organization',
  services: 'Services',
  products: 'Products',
  payments: 'Payments',
  'staff-permissions': 'Staff permissions',
};

function getSettingsTitle(pathname: string): string {
  const segment = pathname.split('/').pop() ?? 'general';
  return SETTINGS_TITLES[segment] ?? 'Settings';
}

export function SettingsDetailLayout() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const location = useLocation();
  const isStaffPermissions = location.pathname.endsWith('/staff-permissions');
  const canManageOrg = user?.role === 'org_owner' || user?.role === 'platform_owner';
  const canAccessStaffPermissions = useOrgAdminAccess(orgId);

  if (isStaffPermissions) {
    if (!canAccessStaffPermissions) {
      return <Navigate to={`/orgs/${orgId}/dashboard`} replace />;
    }
  } else if (!canManageOrg) {
    return <Navigate to={`/orgs/${orgId}/dashboard`} replace />;
  }

  return (
    <div className={location.pathname.endsWith('/plan') ? 'mx-auto max-w-5xl' : 'mx-auto max-w-3xl'}>
      <SettingsBackHeader title={getSettingsTitle(location.pathname)} backTo={`/orgs/${orgId}/settings`} />
      <Outlet />
    </div>
  );
}
