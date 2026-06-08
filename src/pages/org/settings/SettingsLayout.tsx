import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

export function SettingsLayout() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const base = `/orgs/${orgId}/settings`;

  if (user?.role !== 'org_owner' && user?.role !== 'platform_owner') {
    return <Navigate to={`/orgs/${orgId}/dashboard`} replace />;
  }

  const tabs = [
    { label: 'General', to: `${base}/general` },
    { label: 'Org Settings', to: `${base}/org` },
  ];

  return (
    <div>
      <PageHeader title="Settings" description="Manage organization preferences and configuration" />
      <nav className="mb-6 flex gap-1 border-b border-stone-200">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'border-b-2 px-4 py-2 text-sm font-medium transition-colors -mb-px',
                isActive
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-stone-500 hover:text-stone-900',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
