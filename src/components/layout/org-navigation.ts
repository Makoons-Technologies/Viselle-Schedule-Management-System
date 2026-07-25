import {
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  CreditCard,
  Globe,
  LayoutDashboard,
  Package,
  Repeat,
  Scissors,
  Shield,
  Settings,
  Sparkles,
  Users,
  UserCircle,
} from 'lucide-react';

export interface OrgNavLink {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}

export interface OrgNavConfig {
  main: OrgNavLink[];
  settings: OrgNavLink[];
}

export interface SettingsHubGroup {
  items: OrgNavLink[];
}

export function getOrgSettingsHubGroups(
  orgBase: string,
  options: { showAdminSettings: boolean; showStaffPermissions?: boolean },
): SettingsHubGroup[] {
  const groups: SettingsHubGroup[] = [
    {
      items: [
        { label: 'General', to: `${orgBase}/settings/general`, icon: Settings },
        { label: 'Plan', to: `${orgBase}/settings/plan`, icon: Sparkles },
      ],
    },
  ];

  if (options.showStaffPermissions) {
    groups.push({
      items: [{ label: 'Staff permissions', to: `${orgBase}/settings/staff-permissions`, icon: Shield }],
    });
  }

  if (options.showAdminSettings) {
    groups.push({
      items: [
        { label: 'Organization', to: `${orgBase}/settings/org`, icon: Building2 },
        { label: 'Staff', to: `${orgBase}/staff`, icon: Users },
        { label: 'Services', to: `${orgBase}/settings/services`, icon: Scissors },
        { label: 'Products', to: `${orgBase}/settings/products`, icon: Package },
        { label: 'Availability', to: `${orgBase}/availability`, icon: Clock },
        { label: 'Booking website', to: `${orgBase}/website`, icon: Globe },
      ],
    });
    groups.push({
      items: [{ label: 'Payments', to: `${orgBase}/settings/payments`, icon: CreditCard }],
    });
  }

  return groups;
}

export function getOrgNavigation(
  orgBase: string,
  options: { showAdminSettings: boolean; showRecurring: boolean },
): OrgNavConfig {
  const main: OrgNavLink[] = [
    { label: 'Dashboard', to: `${orgBase}/dashboard`, icon: LayoutDashboard },
    { label: 'Calendar', to: `${orgBase}/calendar`, icon: CalendarDays },
    { label: 'Appointments', to: `${orgBase}/appointments`, icon: Calendar },
    { label: 'Customers', to: `${orgBase}/customers`, icon: UserCircle },
  ];

  if (options.showRecurring) {
    main.push({ label: 'Recurring', to: `${orgBase}/recurring`, icon: Repeat });
  }

  const settings: OrgNavLink[] = options.showAdminSettings
    ? [{ label: 'Settings', to: `${orgBase}/settings`, icon: Settings }]
    : [];

  return { main, settings };
}

export function isOrgSettingsPath(pathname: string, orgBase: string): boolean {
  if (!pathname.startsWith(orgBase)) return false;
  if (pathname === `${orgBase}/settings` || pathname.startsWith(`${orgBase}/settings/`)) return true;
  return (
    pathname.startsWith(`${orgBase}/staff`) ||
    pathname.startsWith(`${orgBase}/website`) ||
    pathname.startsWith(`${orgBase}/availability`)
  );
}
