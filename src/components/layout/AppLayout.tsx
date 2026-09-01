import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { MobileNavProvider, useMobileNav } from '@/context/MobileNavContext';
import { OrgOwnerTourProvider } from '@/context/OrgOwnerTourContext';
import { SidebarCollapseProvider } from '@/context/SidebarCollapseContext';
import { AddToHomeScreenBanner } from '@/components/layout/AddToHomeScreenBanner';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { OrgTrialBanner } from '@/components/layout/OrgTrialBanner';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { OrgOwnerTourPanel } from '@/components/onboarding/OrgOwnerTourPanel';
import { useAppShellViewport } from '@/hooks/useAppShellViewport';
import { cn } from '@/lib/utils';

function AppLayoutContent() {
  const location = useLocation();
  const { close } = useMobileNav();
  useAppShellViewport();
  const isCalendarRoute = /\/calendar\/?$/.test(location.pathname);

  useEffect(() => {
    close();
  }, [location.pathname, close]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none bg-stone-50 dark:bg-stone-900">
      {/*
        Banners (when present) live in a solid slab with pt-safe. When they
        are absent the slab is display:none and Topbar owns the notch padding
        in Safari-in-tab. Installed PWA (BEA-83) zeros that extra top pad —
        the opaque status bar already insets — so we do not get a second
        empty band. Title paint stays BEA-78 (system font / no compositor).
      */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="app-shell-chrome shrink-0 pt-safe" data-testid="app-shell-chrome">
          <ImpersonationBanner />
          <OrgTrialBanner />
          <AddToHomeScreenBanner />
        </div>
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <MobileSidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Topbar />
            <main
              className={cn(
                'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]',
                // Calendar panes need nested overflow-x; pan-y on main intersects
                // descendants and cancels native horizontal touch/trackpad inertia.
                isCalendarRoute ? 'touch-pan-x touch-pan-y' : 'touch-pan-y',
                isCalendarRoute
                  ? 'px-2 pb-2 pt-0 sm:px-3 desktop-shell:pb-2'
                  : 'p-4 sm:px-6 sm:pt-6 desktop-shell:pb-6',
              )}
            >
              <Outlet />
            </main>
          </div>
        </div>
      </div>
      <MobileBottomNav />
      <OrgOwnerTourPanel />
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarCollapseProvider>
      <MobileNavProvider>
        <OrgOwnerTourProvider>
          <AppLayoutContent />
        </OrgOwnerTourProvider>
      </MobileNavProvider>
    </SidebarCollapseProvider>
  );
}
