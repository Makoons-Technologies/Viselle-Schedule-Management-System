import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';

const SETTINGS_TITLES: Record<string, string> = {
  general: 'General',
  org: 'Organization',
  services: 'Services',
  products: 'Products',
  payments: 'Payments',
};

function getSettingsTitle(pathname: string): string {
  const segment = pathname.split('/').pop() ?? 'general';
  return SETTINGS_TITLES[segment] ?? 'Settings';
}

export function SettingsDetailLayout() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const location = useLocation();

  if (user?.role !== 'org_owner' && user?.role !== 'platform_owner') {
    return <Navigate to={`/orgs/${orgId}/dashboard`} replace />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SettingsBackHeader title={getSettingsTitle(location.pathname)} backTo={`/orgs/${orgId}/settings`} />
      <Outlet />
    </div>
  );
}
