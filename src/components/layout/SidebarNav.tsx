import {
  ArrowLeft,
  LayoutDashboard,
  Settings,
  UserCircle,
} from 'lucide-react';

import { Link, NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { useOrgOwnerTour } from '@/context/OrgOwnerTourContext';

import { useOrgProductClosed } from '@/hooks/useOrgProductClosed';
import { useOrgNeedsBilling } from '@/hooks/useOrgNeedsBilling';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';

import { getCanceledBillingNavigation, getOrgNavigation } from '@/components/layout/org-navigation';
import {
  getPlatformNavigation,
  getPlatformOrgNavigation,
  isPlatformOrgAdminPath,
} from '@/components/layout/platform-navigation';
import { SidebarTrialStatus } from '@/components/layout/SidebarTrialStatus';
import { ViselleLogo } from '@/components/common/ViselleLogo';

import { orgTourTargetFromTo } from '@/lib/org-owner-tour';
import { cn } from '@/lib/utils';



interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
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



function TourNavLink({
  item,
  onNavigate,
  mobile,
}: {
  item: NavItem;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const { isActive: tourActive, currentTarget } = useOrgOwnerTour();
  const target = orgTourTargetFromTo(item.to);
  const highlighted = tourActive && !!target && currentTarget === target;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      data-tour={target}
      className={(args) =>
        cn(
          navLinkClass(mobile)(args),
          highlighted && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-stone-950',
        )
      }
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {item.label}
    </NavLink>
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
          <TourNavLink key={item.to} item={item} onNavigate={onNavigate} mobile={mobile} />
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
            <TourNavLink key={item.to} item={item} onNavigate={onNavigate} mobile={mobile} />
          ))}

        </div>

        {settingsItems.length > 0 && (
          <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-800">
            <div className="space-y-0.5">
              {settingsItems.map((item) => (
                <TourNavLink key={item.to} item={item} onNavigate={onNavigate} mobile={mobile} />
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
      <div className="flex items-center gap-2.5">
        <ViselleLogo size={32} />
        <span className="text-lg font-semibold text-brand-700 dark:text-brand-300">Viselle</span>
      </div>
      {subtitle && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>}
      <SidebarTrialStatus />
    </div>
  );
}



export function SidebarNav({ onNavigate, mobile }: SidebarNavProps) {

  const { user } = useAuth();

  const { selectedOrgId, selectedOrg } = useOrg();

  const location = useLocation();

  const showRecurring = true;
  const writeLocked = useOrgWriteLocked();
  const needsBilling = useOrgNeedsBilling();
  const productClosed = useOrgProductClosed();

  if (!user) return null;

  if (user.role === 'staff') {
    const orgId = user.organizationId;
    if (!orgId) return null;

    const orgBase = `/orgs/${orgId}`;
    const orgNav = getOrgNavigation(orgBase, {
      showAdminSettings: false,
      showRecurring: false,
    });

    if (productClosed) {
      return (
        <NavSectionWithGroups
          onNavigate={onNavigate}
          mobile={mobile}
          mainItems={[{ label: 'Account', to: `${orgBase}/settings/account`, icon: UserCircle }]}
          settingsItems={[]}
        />
      );
    }

    return (
      <NavSectionWithGroups
        onNavigate={onNavigate}
        mobile={mobile}
        mainItems={orgNav.main}
        settingsItems={[{ label: 'Settings', to: '/staff/settings', icon: Settings }]}
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
      if (productClosed) {
        return (
          <NavSectionWithGroups
            onNavigate={onNavigate}
            mobile={mobile}
            title={`${selectedOrg?.name ?? 'Salon'} · Operations`}
            mainItems={getCanceledBillingNavigation(orgBase)}
            settingsItems={[]}
          />
        );
      }
      const orgNav = getOrgNavigation(orgBase, { showAdminSettings: true, showRecurring });

      return (
        <NavSectionWithGroups
          onNavigate={onNavigate}
          mobile={mobile}
          title={`${selectedOrg?.name ?? 'Salon'} · Operations`}
          mainItems={orgNav.main}
          settingsItems={writeLocked ? [] : orgNav.settings}
        />
      );
    }

    if (platformOrgId && selectedOrg) {
      return (
        <div>
          <Link
            to="/platform/organizations"
            onClick={onNavigate}
            className={cn(
              'mb-3 flex items-center gap-2 rounded-lg px-3 font-medium text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100',
              mobile ? 'min-h-11 py-2.5 text-[0.9375rem]' : 'py-2 text-sm',
            )}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to Organizations
          </Link>
          <NavSection
            onNavigate={onNavigate}
            mobile={mobile}
            title={selectedOrg.name}
            items={getPlatformOrgNavigation(platformOrgId)}
          />
        </div>
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

  const orgBase = `/orgs/${orgId}`;
  const orgNav = getOrgNavigation(orgBase, {
    showAdminSettings: true,
    showRecurring,
  });

  if (needsBilling) {
    return (
      <NavSectionWithGroups
        onNavigate={onNavigate}
        mobile={mobile}
        mainItems={getCanceledBillingNavigation(orgBase)}
        settingsItems={[]}
      />
    );
  }

  return (
    <NavSectionWithGroups
      onNavigate={onNavigate}
      mobile={mobile}
      mainItems={orgNav.main}
      settingsItems={writeLocked ? [] : orgNav.settings}
    />
  );
}


