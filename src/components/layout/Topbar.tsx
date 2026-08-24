import { toast } from 'sonner';
import { LifeBuoy, LogOut, Menu, PanelLeft, PanelLeftClose, Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useMobileNav } from '@/context/MobileNavContext';
import { useSidebarCollapse } from '@/context/SidebarCollapseContext';
import { useOrg } from '@/context/OrgContext';
import { orgApi } from '@/lib/api';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgNeedsBilling } from '@/hooks/useOrgNeedsBilling';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import {
  getPlatformContextFromPath,
  getPlatformOrgBase,
  PLATFORM_CONTEXT,
} from '@/components/layout/platform-navigation';
import { isOrgSettingsPath } from '@/components/layout/org-navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Topbar() {
  const { user, logout, memberships, switchOrganization } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { organizations, selectedOrg } = useOrg();
  const { setOpen: setMobileNavOpen } = useMobileNav();
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapse();
  const navigate = useNavigate();
  const location = useLocation();
  const routeOrgId = useOrgId();
  const writeLocked = useOrgWriteLocked();
  const needsBilling = useOrgNeedsBilling();

  const orgIdForQuery =
    user?.role === 'platform_owner' ? routeOrgId : user?.organizationId ?? routeOrgId;

  const { data: orgData } = useQuery({
    queryKey: ['organization', orgIdForQuery, user?.role],
    queryFn: () => orgApi.getOrganization(orgIdForQuery!),
    enabled: !!orgIdForQuery && user?.role !== 'platform_owner',
  });

  const contextValue =
    user?.role === 'platform_owner'
      ? getPlatformContextFromPath(location.pathname)
      : null;

  const selectedOrgFromContext =
    contextValue && contextValue !== PLATFORM_CONTEXT
      ? organizations.find((o) => o.id === contextValue) ?? selectedOrg
      : null;

  const businessName =
    user?.role === 'platform_owner'
      ? contextValue === PLATFORM_CONTEXT
        ? 'Viselle Platform'
        : selectedOrgFromContext?.name
      : orgData?.organization.name;

  const handleOrgChange = async (organizationId: string) => {
    try {
      const nextUser = await switchOrganization(organizationId);
      const home =
        nextUser.role === 'org_owner'
          ? `/orgs/${organizationId}/dashboard`
          : `/orgs/${organizationId}/calendar`;
      navigate(home);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not switch organization');
    }
  };

  const showOrgSwitcher =
    user?.role !== 'platform_owner' && memberships.length > 1;

  const platformOrgId =
    user?.role === 'platform_owner' && contextValue && contextValue !== PLATFORM_CONTEXT
      ? contextValue
      : null;

  const orgSettingsPath =
    user?.role === 'platform_owner'
      ? platformOrgId
        ? `${getPlatformOrgBase(platformOrgId)}/settings`
        : null
      : routeOrgId
        ? user?.role === 'staff'
          ? `/orgs/${routeOrgId}/settings/account`
          : needsBilling
            ? `/orgs/${routeOrgId}/settings/plan`
            : `/orgs/${routeOrgId}/settings`
        : null;

  const showSettingsButton =
    !!orgSettingsPath &&
    (user?.role === 'platform_owner'
      ? true
      : needsBilling && user?.role === 'org_owner'
        ? true
        : needsBilling && user?.role === 'staff'
          ? true
          : !writeLocked && (user?.role === 'org_owner' || user?.role === 'staff'));

  const onSettingsPage = !orgSettingsPath
    ? false
    : user?.role === 'platform_owner'
      ? location.pathname.startsWith(orgSettingsPath)
      : user?.role === 'staff'
        ? location.pathname.includes('/settings/account')
        : needsBilling
          ? location.pathname.includes('/settings/plan')
          : !!routeOrgId && isOrgSettingsPath(location.pathname, `/orgs/${routeOrgId}`);

  const handleLogout = () => {
    setLogoutOpen(false);
    logout();
    navigate('/login');
  };

  const onHelpPage = location.pathname.startsWith('/support');

  return (
    <>
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-white px-3 dark:border-stone-800 dark:bg-stone-900 sm:h-16 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 desktop-shell:hidden"
          onClick={() => setMobileNavOpen(true)}
          title="Open menu"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-10 w-10 shrink-0 desktop-shell:inline-flex"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Pin sidebar' : 'Unpin sidebar'}
          aria-label={sidebarCollapsed ? 'Pin sidebar' : 'Unpin sidebar'}
        >
          {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>

        {showOrgSwitcher ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Select value={user?.organizationId ?? undefined} onValueChange={handleOrgChange}>
              <SelectTrigger className="h-10 w-full min-w-0 max-w-[11rem] text-xs sm:max-w-xs sm:text-sm md:max-w-sm">
                <SelectValue placeholder="Select workplace" />
              </SelectTrigger>
              <SelectContent>
                {memberships.map((membership) => (
                  <SelectItem key={membership.organizationId} value={membership.organizationId}>
                    {membership.organizationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
              {businessName ?? 'Viselle'}
            </p>
            {selectedOrgFromContext && (
              <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                /{selectedOrgFromContext.slug}
              </p>
            )}
            {!selectedOrgFromContext && (
              <p className="truncate text-xs capitalize text-stone-500 dark:text-stone-400 desktop-shell:hidden">
                {user?.role?.replace('_', ' ')}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-10 w-10', onHelpPage && 'bg-stone-100 text-brand-700 dark:bg-stone-800 dark:text-brand-300')}
          onClick={() => navigate('/support')}
          title="Help & support"
          aria-label="Help & support"
        >
          <LifeBuoy className="h-4 w-4" />
        </Button>
        {showSettingsButton ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-10 w-10', onSettingsPage && 'bg-stone-100 text-brand-700 dark:bg-stone-800 dark:text-brand-300')}
            onClick={() => navigate(orgSettingsPath!)}
            title={user?.role === 'platform_owner' ? 'Organization admin' : 'Settings'}
            aria-label={user?.role === 'platform_owner' ? 'Organization admin' : 'Settings'}
          >
            <Settings className="h-4 w-4" />
          </Button>
        ) : null}
        <div className="hidden text-right desktop-shell:block">
          <p className="max-w-[12rem] truncate text-sm font-medium text-stone-900 dark:text-stone-100 lg:max-w-none">{user?.email}</p>
          <p className="text-xs capitalize text-stone-500 dark:text-stone-400">{user?.role?.replace('_', ' ')}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => setLogoutOpen(true)}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
    <ConfirmDialog
      open={logoutOpen}
      onOpenChange={setLogoutOpen}
      title="Log out?"
      description="You will need to sign in again to access your account."
      confirmLabel="Log out"
      destructive
      onConfirm={handleLogout}
    />
    </>
  );
}
