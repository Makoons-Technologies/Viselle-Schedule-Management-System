import {
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  LayoutDashboard,
  Settings,
  Sparkles,
  TicketPercent,
  UserCircle,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgCanceled } from '@/hooks/useOrgCanceled';
import { useOrgNeedsBilling } from '@/hooks/useOrgNeedsBilling';
import { isOrgSettingsPath } from '@/components/layout/org-navigation';
import { getPlatformOrgBase, isPlatformOrgAdminPath } from '@/components/layout/platform-navigation';
import { cn } from '@/lib/utils';
import { useOrgOwnerTour } from '@/context/OrgOwnerTourContext';
import { orgTourTargetFromTo } from '@/lib/org-owner-tour';

interface BottomNavItem {
  key: string;
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  match: (pathname: string, orgBase: string) => boolean;
}

const bottomNavClassName =
  'shrink-0 border-t border-stone-200 bg-white px-2 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pt-1 dark:border-stone-800 dark:bg-stone-900 desktop-shell:hidden';

function BottomNavLink({ item, active }: { item: BottomNavItem; active: boolean }) {
  const { isActive: tourActive, currentTarget } = useOrgOwnerTour();
  const target = orgTourTargetFromTo(item.to);
  const highlighted = tourActive && !!target && currentTarget === target;

  return (
    <NavLink
      to={item.to}
      data-tour={target}
      className={cn(
        'flex min-h-12 min-w-0 flex-1 flex-col items-center justify-end gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium transition-colors sm:text-xs',
        active ? 'text-brand-700 dark:text-brand-300' : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200',
        highlighted && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-stone-900',
      )}
      aria-label={item.label}
    >
      <item.icon className={cn('h-5 w-5 shrink-0', active && 'stroke-[2.5]')} />
      <span className="max-w-full truncate">{item.label}</span>
    </NavLink>
  );
}

export function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const routeOrgId = useOrgId();
  const { selectedOrgId } = useOrg();
  const needsBilling = useOrgNeedsBilling();
  const canceled = useOrgCanceled();

  if (!user) return null;

  if (user.role === 'staff') {
    const orgId = user.organizationId;
    if (!orgId) return null;

    const orgBase = `/orgs/${orgId}`;

    if (canceled) {
      const items: BottomNavItem[] = [
        {
          key: 'account',
          label: 'Account',
          to: `${orgBase}/settings/account`,
          icon: UserCircle,
          match: (p, base) => p.startsWith(`${base}/settings/account`),
        },
      ];

      return (
        <nav className={bottomNavClassName} aria-label="Primary navigation">
          <div className="mx-auto flex max-w-lg items-stretch justify-center gap-1">
            {items.map((item) => (
              <BottomNavLink key={item.key} item={item} active={item.match(location.pathname, orgBase)} />
            ))}
          </div>
        </nav>
      );
    }

    const items: BottomNavItem[] = [
      {
        key: 'dashboard',
        label: 'Home',
        to: `${orgBase}/dashboard`,
        icon: LayoutDashboard,
        match: (p, base) => p === `${base}/dashboard`,
      },
      {
        key: 'calendar',
        label: 'Calendar',
        to: `${orgBase}/calendar`,
        icon: CalendarDays,
        match: (p, base) => p.startsWith(`${base}/calendar`),
      },
      {
        key: 'appointments',
        label: 'Appts',
        to: `${orgBase}/appointments`,
        icon: Calendar,
        match: (p, base) => p.startsWith(`${base}/appointments`),
      },
      {
        key: 'availability',
        label: 'Hours',
        to: '/staff/availability',
        icon: Clock,
        match: (p) => p.startsWith('/staff/availability'),
      },
    ];

    return (
      <nav className={bottomNavClassName} aria-label="Primary navigation">
        <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
          {items.map((item) => (
            <BottomNavLink key={item.key} item={item} active={item.match(location.pathname, '')} />
          ))}
        </div>
      </nav>
    );
  }

  if (user.role === 'platform_owner' && isPlatformOrgAdminPath(location.pathname)) {
    const platformOrgId = location.pathname.match(/^\/platform\/orgs\/([^/]+)/)?.[1];
    if (!platformOrgId) return null;

    const platformOrgBase = getPlatformOrgBase(platformOrgId);
    const items: BottomNavItem[] = [
      {
        key: 'overview',
        label: 'Overview',
        to: platformOrgBase,
        icon: LayoutDashboard,
        match: (p, base) => p === base,
      },
      {
        key: 'settings',
        label: 'Settings',
        to: `${platformOrgBase}/settings`,
        icon: Settings,
        match: (p, base) => p.startsWith(`${base}/settings`),
      },
    ];

    return (
      <nav className={bottomNavClassName} aria-label="Primary navigation">
        <div className="mx-auto flex max-w-lg items-stretch justify-center gap-1">
          {items.map((item) => (
            <BottomNavLink key={item.key} item={item} active={item.match(location.pathname, platformOrgBase)} />
          ))}
        </div>
      </nav>
    );
  }

  if (user.role === 'platform_owner' && !location.pathname.startsWith('/orgs/')) {
    const items: BottomNavItem[] = [
      {
        key: 'platform',
        label: 'Home',
        to: '/platform/dashboard',
        icon: LayoutDashboard,
        match: (p) => p.startsWith('/platform/dashboard'),
      },
      {
        key: 'orgs',
        label: 'Orgs',
        to: '/platform/organizations',
        icon: Building2,
        match: (p) => p.startsWith('/platform/organizations'),
      },
      {
        key: 'trials',
        label: 'Trials',
        to: '/platform/trials',
        icon: TicketPercent,
        match: (p) => p.startsWith('/platform/trials'),
      },
    ];

    return (
      <nav className={bottomNavClassName} aria-label="Primary navigation">
        <div className="mx-auto flex max-w-lg items-stretch justify-center gap-1">
          {items.map((item) => (
            <BottomNavLink key={item.key} item={item} active={item.match(location.pathname, '')} />
          ))}
        </div>
      </nav>
    );
  }

  const orgId = user.role === 'platform_owner' ? selectedOrgId ?? routeOrgId : user.organizationId ?? routeOrgId;
  if (!orgId) return null;

  const orgBase = `/orgs/${orgId}`;

  const items: BottomNavItem[] =
    needsBilling && user.role === 'org_owner'
      ? [
          {
            key: 'plan',
            label: 'Plan',
            to: `${orgBase}/settings/plan`,
            icon: Sparkles,
            match: (p, base) => p.startsWith(`${base}/settings/plan`),
          },
          {
            key: 'account',
            label: 'Account',
            to: `${orgBase}/settings/account`,
            icon: UserCircle,
            match: (p, base) => p.startsWith(`${base}/settings/account`),
          },
        ]
      : [
          {
            key: 'dashboard',
            label: 'Home',
            to: `${orgBase}/dashboard`,
            icon: LayoutDashboard,
            match: (p, base) => p === `${base}/dashboard`,
          },
          {
            key: 'calendar',
            label: 'Calendar',
            to: `${orgBase}/calendar`,
            icon: CalendarDays,
            match: (p, base) => p.startsWith(`${base}/calendar`),
          },
          {
            key: 'appointments',
            label: 'Appts',
            to: `${orgBase}/appointments`,
            icon: Calendar,
            match: (p, base) => p.startsWith(`${base}/appointments`),
          },
          {
            key: 'customers',
            label: 'Clients',
            to: `${orgBase}/customers`,
            icon: UserCircle,
            match: (p, base) => p.startsWith(`${base}/customers`),
          },
        ];

  return (
    <nav className={bottomNavClassName} aria-label="Primary navigation">
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {items.map((item) => (
          <BottomNavLink
            key={item.key}
            item={item}
            active={
              needsBilling && user.role === 'org_owner'
                ? item.match(location.pathname, orgBase)
                : item.match(location.pathname, orgBase) &&
                  !isOrgSettingsPath(location.pathname, orgBase)
            }
          />
        ))}
      </div>
    </nav>
  );
}
