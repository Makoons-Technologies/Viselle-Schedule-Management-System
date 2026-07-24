import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { MobileNavProvider, useMobileNav } from '@/context/MobileNavContext';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { OrgTrialBanner } from '@/components/layout/OrgTrialBanner';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

function AppLayoutContent() {
  const location = useLocation();
  const { close } = useMobileNav();

  useEffect(() => {
    close();
  }, [location.pathname, close]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-stone-50 dark:bg-stone-950">
      <ImpersonationBanner />
      <OrgTrialBanner />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <MobileSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 md:pb-6">
            <Outlet />
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <MobileNavProvider>
      <AppLayoutContent />
    </MobileNavProvider>
  );
}
