import {
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  CreditCard,
  ClipboardList,
  FileText,
  Gift,
  Globe,
  LayoutDashboard,
  LayoutTemplate,
  Package,
  Percent,
  Repeat,
  Ticket,
  Scissors,
  ScrollText,
  Shield,
  ShieldCheck,
  Settings,
  Sparkles,
  Users,
  UserCircle,
} from 'lucide-react';
import { VISELLE_PRIVACY_URL, VISELLE_TERMS_URL } from '@/lib/legal';

export interface OrgNavLink {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  external?: boolean;
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

  if (options.showAdminSettings) {
    const teamItems: OrgNavLink[] = [
      { label: 'Organization', to: `${orgBase}/settings/org`, icon: Building2 },
      { label: 'Staff', to: `${orgBase}/staff`, icon: Users },
    ];
    if (options.showStaffPermissions) {
      teamItems.push({ label: 'Staff permissions', to: `${orgBase}/settings/staff-permissions`, icon: Shield });
    }
    groups.push({ items: teamItems });

    groups.push({
      items: [
        { label: 'Services', to: `${orgBase}/settings/services`, icon: Scissors },
        { label: 'Products', to: `${orgBase}/settings/products`, icon: Package },
        { label: 'Hours', to: `${orgBase}/availability`, icon: Clock },
      ],
    });

    groups.push({
      items: [
        { label: 'Homepage', to: `${orgBase}/settings/homepage`, icon: LayoutTemplate },
        { label: 'Packages', to: `${orgBase}/settings/packages`, icon: Ticket },
        { label: 'Memberships', to: `${orgBase}/settings/memberships`, icon: Sparkles },
        { label: 'Commissions', to: `${orgBase}/settings/commissions`, icon: Percent },
      ],
    });

    groups.push({
      items: [
        { label: 'Booking website', to: `${orgBase}/website`, icon: Globe },
        { label: 'Payments', to: `${orgBase}/settings/payments`, icon: CreditCard },
        { label: 'Account', to: `${orgBase}/settings/account`, icon: UserCircle },
      ],
    });
  } else if (options.showStaffPermissions) {
    groups.push({
      items: [{ label: 'Staff permissions', to: `${orgBase}/settings/staff-permissions`, icon: Shield }],
    });
  }

  groups.push({
    items: [
      { label: 'Terms & Conditions', to: VISELLE_TERMS_URL, icon: ScrollText, external: true },
      { label: 'Privacy Policy', to: VISELLE_PRIVACY_URL, icon: ShieldCheck, external: true },
    ],
  });

  return groups;
}

/** Plan / Account only — same lockout nav for canceled owners and Open salon. */
export function getCanceledBillingNavigation(orgBase: string): OrgNavLink[] {
  return [
    { label: 'Plan', to: `${orgBase}/settings/plan`, icon: Sparkles },
    { label: 'Account', to: `${orgBase}/settings/account`, icon: UserCircle },
  ];
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
    { label: 'Waitlist', to: `${orgBase}/waitlist`, icon: ClipboardList },
    { label: 'Forms', to: `${orgBase}/forms`, icon: FileText },
    { label: 'Gift cards', to: `${orgBase}/gift-cards`, icon: Gift },
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
