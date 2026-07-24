import { useAuth } from '@/context/AuthContext';
import { SidebarBrand, SidebarNav } from '@/components/layout/SidebarNav';
import { PoweredByMakoons } from '@/components/common/PoweredByMakoons';

export function Sidebar() {
  const { user } = useAuth();

  if (!user) return null;

  const subtitle = user.role === 'platform_owner' ? 'Platform Admin' : undefined;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 md:flex">
      <SidebarBrand subtitle={subtitle} />
      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav />
      </div>
      <div className="border-t border-stone-200 px-4 py-3 dark:border-stone-800">
        <PoweredByMakoons />
      </div>
    </aside>
  );
}
