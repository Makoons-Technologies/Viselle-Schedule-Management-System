import { ChevronRight, Clock, Shield, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { panelClassName } from '@/components/common/Panel';
import { useAuth } from '@/context/AuthContext';
import { useOrgAdminAccess } from '@/hooks/useOrgAdminAccess';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { cn } from '@/lib/utils';

export function StaffSettingsHubPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? '';
  const canManageStaff = useOrgAdminAccess(orgId);
  const writeLocked = useOrgWriteLocked();
  const orgBase = `/orgs/${orgId}`;

  const items = [
    { label: 'Hours', to: '/staff/availability', icon: Clock },
    { label: 'Account', to: `${orgBase}/settings/account`, icon: UserCircle },
    ...(canManageStaff && !writeLocked
      ? [{ label: 'Staff permissions', to: '/staff/settings/staff-permissions', icon: Shield }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-lg">
      <SettingsBackHeader title="Settings" backTo={`${orgBase}/dashboard`} />
      <div className={cn('overflow-hidden', panelClassName)}>
        <ul>
          {items.map((item, index) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  'flex min-h-[3.25rem] items-center gap-4 px-4 py-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50',
                  index < items.length - 1 && 'border-b border-stone-100 dark:border-stone-800',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0 text-stone-700 dark:text-stone-300" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 text-[0.9375rem] font-medium text-stone-900 dark:text-stone-100">
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
