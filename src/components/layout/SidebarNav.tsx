import {

  Clock,

  LayoutDashboard,
  Shield,
} from 'lucide-react';

import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';

import { useOrg } from '@/context/OrgContext';

import { useOrgPlan } from '@/hooks/useOrgPlan';

import { useOrgId } from '@/hooks/useOrgId';
import { useOrgAdminAccess } from '@/hooks/useOrgAdminAccess';
import { useOrgTrialExpired } from '@/hooks/useOrgTrialExpired';

import { getOrgNavigation } from '@/components/layout/org-navigation';
import {
  getPlatformNavigation,
  getPlatformOrgNavigation,
  isPlatformOrgAdminPath,
} from '@/components/layout/platform-navigation';

import { cn } from '@/lib/utils';



interface NavItem {

  label: string;

  to: string;

  icon: typeof LayoutDashboard;

}



interface SidebarNavProps {

  onNavigate?: () => void;

  mobile?: boolean;

}



function navLinkClass(mobile?: boolean) {

  return ({ isActive }: { isActive: boolean }) =>

    cn(

      'flex items-center gap-3 rounded-lg border border-transparent px-3 font-medium transition-colors',

      mobile ? 'min-h-11 py-2.5 text-[0.9375rem]' : 'py-2 text-sm',

      isActive
        ? 'border-brand-500 text-brand-700 dark:border-brand-400 dark:text-brand-300'
        : 'text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-100',

    );

}



function NavSection({

  title,

  items,

  onNavigate,

  mobile,

}: {

  title?: string;

  items: NavItem[];

  onNavigate?: () => void;

  mobile?: boolean;

}) {

  return (

    <div className="mb-4">

      {title && (

        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">{title}</p>

      )}

      <nav className="space-y-0.5">

        {items.map((item) => (

          <NavLink key={item.to} to={item.to} onClick={onNavigate} className={navLinkClass(mobile)}>

            <item.icon className="h-5 w-5 shrink-0" />

            {item.label}

          </NavLink>

        ))}

      </nav>

    </div>

  );

}



function NavSectionWithGroups({

  title,

  mainItems,

  settingsItems,

  onNavigate,

  mobile,

}: {

  title?: string;

  mainItems: NavItem[];

  settingsItems: NavItem[];

  onNavigate?: () => void;

  mobile?: boolean;

}) {

  return (

    <div className="mb-4">

      {title && (

        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">{title}</p>

      )}

      <nav className="space-y-4">

        <div className="space-y-0.5">

          {mainItems.map((item) => (

            <NavLink key={item.to} to={item.to} onClick={onNavigate} className={navLinkClass(mobile)}>

              <item.icon className="h-5 w-5 shrink-0" />

              {item.label}

            </NavLink>

          ))}

        </div>

        {settingsItems.length > 0 && (
          <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-800">
            <div className="space-y-0.5">
              {settingsItems.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={onNavigate} className={navLinkClass(mobile)}>
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}

      </nav>

    </div>

  );

}



export function SidebarBrand({ subtitle }: { subtitle?: string }) {

  return (

    <div className="border-b border-stone-200 px-4 py-5 dark:border-stone-800">

      <span className="text-lg font-semibold text-brand-700 dark:text-brand-300">Viselle</span>

      {subtitle && <p className="text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>}

    </div>

  );

}



export function SidebarNav({ onNavigate, mobile }: SidebarNavProps) {

  const { user } = useAuth();

  const { selectedOrgId, selectedOrg } = useOrg();

  const routeOrgId = useOrgId();

  const effectiveOrgId = user?.role === 'platform_owner' ? selectedOrgId : user?.organizationId ?? routeOrgId;

  const { plan } = useOrgPlan(effectiveOrgId ?? undefined);

  const location = useLocation();

  const showRecurring = plan ? plan.recurringAppointmentsEnabled : true;
  const canManageStaff = useOrgAdminAccess(effectiveOrgId ?? undefined);
  const trialExpired = useOrgTrialExpired();

  if (!user) return null;



  if (user.role === 'staff') {
    const orgId = user.organizationId;
    if (!orgId) return null;

    const orgBase = `/orgs/${orgId}`;
    const orgNav = getOrgNavigation(orgBase, {
      showAdminSettings: false,
      showRecurring: false,
    });

    const staffItems = [
      ...orgNav.main,
      { label: 'My Availability', to: '/staff/availability', icon: Clock },
    ];

    if (canManageStaff && !trialExpired) {
      staffItems.push({
        label: 'Staff permissions',
        to: '/staff/settings/staff-permissions',
        icon: Shield,
      });
    }

    return (
      <NavSectionWithGroups
        onNavigate={onNavigate}
        mobile={mobile}
        mainItems={staffItems}
        settingsItems={orgNav.settings}
      />
    );
  }



  if (user.role === 'platform_owner') {
    const inSalonContext = location.pathname.startsWith('/orgs/');
    const inPlatformOrgAdmin = isPlatformOrgAdminPath(location.pathname);
    const platformOrgId = inPlatformOrgAdmin
      ? location.pathname.match(/^\/platform\/orgs\/([^/]+)/)?.[1]
      : null;

    if (inSalonContext && selectedOrgId) {
      const orgBase = `/orgs/${selectedOrgId}`;
      const orgNav = getOrgNavigation(orgBase, { showAdminSettings: true, showRecurring });

      return (
        <NavSectionWithGroups
          onNavigate={onNavigate}
          mobile={mobile}
          title={`${selectedOrg?.name ?? 'Salon'} · Operations`}
          mainItems={orgNav.main}
          settingsItems={trialExpired ? [] : orgNav.settings}
        />
      );
    }

    if (platformOrgId && selectedOrg) {
      return (
        <NavSection
          onNavigate={onNavigate}
          mobile={mobile}
          title={selectedOrg.name}
          items={getPlatformOrgNavigation(platformOrgId)}
        />
      );
    }

    return (
      <NavSection
        onNavigate={onNavigate}
        mobile={mobile}
        title="Viselle Platform"
        items={getPlatformNavigation()}
      />
    );
  }



  const orgId = user.organizationId;

  if (!orgId) return null;

  const orgNav = getOrgNavigation(`/orgs/${orgId}`, {

    showAdminSettings: true,

    showRecurring,

  });



  return (

    <NavSectionWithGroups

      onNavigate={onNavigate}

      mobile={mobile}

      mainItems={orgNav.main}

      settingsItems={trialExpired ? [] : orgNav.settings}

    />

  );

}


