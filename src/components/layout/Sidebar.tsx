import { useAuth } from '@/context/AuthContext';
import { ReferAFriendPanel } from '@/components/layout/ReferAFriendPanel';
import { SidebarBrand, SidebarNav } from '@/components/layout/SidebarNav';

export function Sidebar() {
  const { user } = useAuth();

  if (!user) return null;

  const subtitle = user.role === 'platform_owner' ? 'Platform Admin' : undefined;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 md:flex">
      <SidebarBrand subtitle={subtitle} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        <SidebarNav />
        <div className="mt-auto border-t border-stone-200 pt-4 dark:border-stone-800">
          <ReferAFriendPanel />
        </div>
      </div>
    </aside>
  );
}
