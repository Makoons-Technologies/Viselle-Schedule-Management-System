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
import { useAppShellViewport } from '@/hooks/useAppShellViewport';

function AppLayoutContent() {
  const location = useLocation();
  const { close } = useMobileNav();
  useAppShellViewport();

  useEffect(() => {
    close();
  }, [location.pathname, close]);

  return (
    // svh stays stable when the keyboard opens; dvh on iOS PWAs often does not restore.
    <div className="flex h-[100svh] max-h-[100svh] flex-col overflow-hidden overscroll-none bg-stone-50 dark:bg-stone-950">
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
            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 sm:px-6 sm:pt-6 md:pb-6">
              <Outlet />
            </main>
          </div>
        </div>
        <MobileBottomNav />
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
