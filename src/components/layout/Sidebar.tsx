import { useAuth } from '@/context/AuthContext';
import { useSidebarCollapse } from '@/context/SidebarCollapseContext';
import { ReferAFriendPanel } from '@/components/layout/ReferAFriendPanel';
import { SidebarBrand, SidebarNav } from '@/components/layout/SidebarNav';
import { PoweredByMakoons } from '@/components/common/PoweredByMakoons';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { user } = useAuth();
  const { collapsed } = useSidebarCollapse();

  if (!user) return null;

  const subtitle = user.role === 'platform_owner' ? 'Platform Admin' : undefined;

  return (
    <aside
      className={cn(
        'hidden w-60 shrink-0 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 desktop-shell:flex',
        collapsed && 'desktop-shell:hidden',
      )}
    >
      <SidebarBrand subtitle={subtitle} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        <SidebarNav />
        <div className="mt-auto border-t border-stone-200 pt-4 dark:border-stone-800">
          <ReferAFriendPanel />
        </div>
      </div>
      <div className="shrink-0 border-t border-stone-200 px-4 py-3 text-right dark:border-stone-800">
        <PoweredByMakoons className="text-right" />
      </div>
    </aside>
  );
}
