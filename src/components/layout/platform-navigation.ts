import { Building2, LayoutDashboard, LifeBuoy, Settings, TicketPercent } from 'lucide-react';

export const PLATFORM_CONTEXT = 'platform';

export interface PlatformNavLink {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}

export function getPlatformOrgBase(orgId: string) {
  return `/platform/orgs/${orgId}`;
}

export function getPlatformNavigation(): PlatformNavLink[] {
  return [
    { label: 'Dashboard', to: '/platform/dashboard', icon: LayoutDashboard },
    { label: 'Organizations', to: '/platform/organizations', icon: Building2 },
    { label: 'Trials & Campaigns', to: '/platform/trials', icon: TicketPercent },
    { label: 'Support inbox', to: '/platform/support', icon: LifeBuoy },
  ];
}

export function getPlatformOrgNavigation(orgId: string): PlatformNavLink[] {
  const base = getPlatformOrgBase(orgId);
  return [
    { label: 'Overview', to: base, icon: LayoutDashboard },
    { label: 'Settings', to: `${base}/settings`, icon: Settings },
  ];
}
