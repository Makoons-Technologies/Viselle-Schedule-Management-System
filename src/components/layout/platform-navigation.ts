import { Building2, Bell, Calendar, Globe, LayoutDashboard, LifeBuoy, Settings, TicketPercent } from 'lucide-react';

export const PLATFORM_CONTEXT = 'platform';

export interface PlatformNavLink {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  /** Exact path match only (avoids parent routes staying active on nested pages). */
  end?: boolean;
}

export function getPlatformOrgBase(orgId: string) {
  return `/platform/orgs/${orgId}`;
}

export function getPlatformNavigation(): PlatformNavLink[] {
  return [
    { label: 'Dashboard', to: '/platform/dashboard', icon: LayoutDashboard },
    { label: 'Demos', to: '/platform/demos', icon: Calendar },
    { label: 'Organizations', to: '/platform/organizations', icon: Building2 },
    { label: 'Trials & Campaigns', to: '/platform/trials', icon: TicketPercent },
    { label: 'Inbox', to: '/platform/support', icon: LifeBuoy },
    { label: 'Custom websites', to: '/platform/custom-websites', icon: Globe },
    { label: 'Notifications', to: '/platform/notifications', icon: Bell },
  ];
}

export function getPlatformOrgNavigation(orgId: string): PlatformNavLink[] {
  const base = getPlatformOrgBase(orgId);
  return [
    { label: 'Overview', to: base, icon: LayoutDashboard, end: true },
    { label: 'Settings', to: `${base}/settings`, icon: Settings },
  ];
}

export function getPlatformContextFromPath(pathname: string): string {
  const platformOrgMatch = pathname.match(/^\/platform\/orgs\/([^/]+)/);
  if (platformOrgMatch) return platformOrgMatch[1];

  const orgMatch = pathname.match(/^\/orgs\/([^/]+)/);
  if (orgMatch) return orgMatch[1];

  return PLATFORM_CONTEXT;
}

export function isPlatformOrgAdminPath(pathname: string): boolean {
  return pathname.startsWith('/platform/orgs/');
}
