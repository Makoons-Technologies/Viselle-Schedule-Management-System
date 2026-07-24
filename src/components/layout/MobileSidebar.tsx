import { useAuth } from '@/context/AuthContext';
import { useMobileNav } from '@/context/MobileNavContext';
import { SidebarBrand, SidebarNav } from '@/components/layout/SidebarNav';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { PoweredByMakoons } from '@/components/common/PoweredByMakoons';

export function MobileSidebar() {
  const { user } = useAuth();
  const { open, setOpen, close } = useMobileNav();

  if (!user) return null;

  const subtitle =
    user.role === 'platform_owner' ? 'Platform Admin' : undefined;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="flex h-full w-[min(100vw-1rem,18rem)] max-w-xs flex-col gap-0 p-0">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <SidebarBrand subtitle={subtitle} />
        <div className="flex-1 overflow-y-auto p-3 [&_a]:min-h-11 [&_a]:py-2.5 [&_a]:text-[0.9375rem] [&_button]:min-h-11">
          <SidebarNav onNavigate={close} mobile />
        </div>
        <div className="border-t border-stone-200 px-4 py-3 dark:border-stone-800">
          <PoweredByMakoons />
        </div>
      </SheetContent>
    </Sheet>
  );
}
