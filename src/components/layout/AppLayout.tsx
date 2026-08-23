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
      {/* Dark band under translucent iOS status bar so icons stay readable */}
      <div className="shrink-0 bg-[#0f172a] pt-safe" aria-hidden />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ImpersonationBanner />
        <OrgTrialBanner />
        <AddToHomeScreenBanner />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />
          <MobileSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar />
            <main
              className={cn(
                'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]',
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
