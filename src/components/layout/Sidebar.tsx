import {
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  LayoutDashboard,
  Bell,
  Repeat,
  Scissors,
  Settings,
  Users,
  UserCircle,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}

interface NavSubItem {
  label: string;
  to: string;
}

interface NavGroupItem {
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
  children: NavSubItem[];
}

function NavSection({ title, items }: { title?: string; items: NavItem[] }) {
  return (
    <div className="mb-4">
      {title && <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-stone-400">{title}</p>}
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function NavGroup({ item }: { item: NavGroupItem }) {
  const location = useLocation();
  const isGroupActive = location.pathname.startsWith(item.to);

  return (
    <div className="space-y-0.5">
      <NavLink
        to={item.children[0]?.to ?? item.to}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isGroupActive ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {item.label}
      </NavLink>
      <nav className="ml-4 space-y-0.5 border-l border-stone-200 pl-2">
        {item.children.map((child) => (
          <NavLink
            key={child.to}
            to={child.to}
            className={({ isActive }) =>
              cn(
                'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                isActive ? 'font-medium text-brand-700' : 'text-stone-500 hover:text-stone-900',
              )
            }
          >
            {child.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function NavSectionWithGroups({ title, items, groups }: { title?: string; items: NavItem[]; groups?: NavGroupItem[] }) {
  return (
    <div className="mb-4">
      {title && <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-stone-400">{title}</p>}
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
        {groups?.map((group) => (
          <NavGroup key={group.to} item={group} />
        ))}
      </nav>
    </div>
  );
}

function settingsGroup(orgBase: string): NavGroupItem {
  return {
    label: 'Settings',
    icon: Settings,
    to: `${orgBase}/settings`,
    children: [
      { label: 'General', to: `${orgBase}/settings/general` },
      { label: 'Org Settings', to: `${orgBase}/settings/org` },
    ],
  };
}

function orgNavItems(
  orgBase: string,
  { isOrgOwner, showSettings }: { isOrgOwner: boolean; showSettings: boolean },
): { items: NavItem[]; groups: NavGroupItem[] } {
  const ownerItems: NavItem[] = isOrgOwner
    ? [
        { label: 'Staff', to: `${orgBase}/staff`, icon: Users },
        { label: 'Services', to: `${orgBase}/services`, icon: Scissors },
      ]
    : [];

  return {
    items: [
      { label: 'Dashboard', to: `${orgBase}/dashboard`, icon: LayoutDashboard },
      { label: 'Calendar', to: `${orgBase}/calendar`, icon: CalendarDays },
      { label: 'Appointments', to: `${orgBase}/appointments`, icon: Calendar },
      { label: 'Customers', to: `${orgBase}/customers`, icon: UserCircle },
      ...ownerItems,
      { label: 'Availability', to: `${orgBase}/availability`, icon: Clock },
      { label: 'Reminders', to: `${orgBase}/reminders`, icon: Bell },
      { label: 'Recurring', to: `${orgBase}/recurring`, icon: Repeat },
    ],
    groups: showSettings ? [settingsGroup(orgBase)] : [],
  };
}

export function Sidebar() {
  const { user } = useAuth();
  const { selectedOrgId, selectedOrg } = useOrg();

  if (!user) return null;

  if (user.role === 'staff') {
    return (
      <aside className="flex w-60 shrink-0 flex-col border-r border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-5">
          <span className="text-lg font-semibold text-brand-700">Viselle</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavSection
            items={[
              { label: 'My Schedule', to: '/staff/schedule', icon: CalendarDays },
              { label: 'My Appointments', to: '/staff/appointments', icon: Calendar },
              { label: 'My Availability', to: '/staff/availability', icon: Clock },
            ]}
          />
        </div>
      </aside>
    );
  }

  if (user.role === 'platform_owner') {
    const orgBase = selectedOrgId ? `/orgs/${selectedOrgId}` : null;
    const orgNav = orgBase ? orgNavItems(orgBase, { isOrgOwner: false, showSettings: true }) : null;

    return (
      <aside className="flex w-60 shrink-0 flex-col border-r border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-5">
          <span className="text-lg font-semibold text-brand-700">Viselle</span>
          <p className="text-xs text-stone-500">Platform Admin</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavSection
            items={[
              { label: 'Dashboard', to: '/platform/dashboard', icon: LayoutDashboard },
              { label: 'Organizations', to: '/platform/organizations', icon: Building2 },
            ]}
          />
          {selectedOrg && orgNav && (
            <NavSectionWithGroups title={selectedOrg.name} items={orgNav.items} groups={orgNav.groups} />
          )}
        </div>
      </aside>
    );
  }

  const orgId = user.organizationId;
  if (!orgId) return null;
  const orgNav = orgNavItems(`/orgs/${orgId}`, { isOrgOwner: true, showSettings: true });

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-4 py-5">
        <span className="text-lg font-semibold text-brand-700">Viselle</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavSectionWithGroups items={orgNav.items} groups={orgNav.groups} />
      </div>
    </aside>
  );
}
