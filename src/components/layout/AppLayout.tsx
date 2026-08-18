import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { MobileNavProvider, useMobileNav } from '@/context/MobileNavContext';
import { OrgOwnerTourProvider } from '@/context/OrgOwnerTourContext';
import { AddToHomeScreenBanner } from '@/components/layout/AddToHomeScreenBanner';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { OrgTrialBanner } from '@/components/layout/OrgTrialBanner';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { OrgOwnerTourPanel } from '@/components/onboarding/OrgOwnerTourPanel';

function AppLayoutContent() {
  const location = useLocation();
  const { close } = useMobileNav();

  useEffect(() => {
    close();
  }, [location.pathname, close]);

  return (
    // Outer fill matches app chrome so home-indicator gaps are never the PWA maroon body color.
    <div className="flex h-[100dvh] flex-col overflow-hidden overscroll-x-none bg-stone-50 dark:bg-stone-950">
      {/* Dark band under translucent iOS status bar so icons stay readable */}
      <div className="shrink-0 bg-[#0f172a] pt-[env(safe-area-inset-top)]" aria-hidden />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ImpersonationBanner />
        <OrgTrialBanner />
        <AddToHomeScreenBanner />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />
          <MobileSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pt-6 sm:pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-6">
              <Outlet />
            </main>
          </div>
          <MobileBottomNav />
        </div>
      </div>
      <OrgOwnerTourPanel />
    </div>
  );
}

export function AppLayout() {
  return (
    <MobileNavProvider>
      <OrgOwnerTourProvider>
        <AppLayoutContent />
      </OrgOwnerTourProvider>
    </MobileNavProvider>
  );
}
