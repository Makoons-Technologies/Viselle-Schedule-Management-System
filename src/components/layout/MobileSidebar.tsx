import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMobileNav } from '@/context/MobileNavContext';
import { useMobileDrawerGestures } from '@/hooks/useMobileDrawerGestures';
import {
  ReferAFriendDialog,
  ReferAFriendTrigger,
} from '@/components/layout/ReferAFriendPanel';
import { SidebarBrand, SidebarNav } from '@/components/layout/SidebarNav';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function MobileSidebar() {
  const { user } = useAuth();
  const { open, setOpen, close } = useMobileNav();
  const [referOpen, setReferOpen] = useState(false);
  const { panelRef, panelStyle, panelClassName, overlayStyle } = useMobileDrawerGestures(
    open,
    setOpen,
    !!user,
  );

  if (!user) return null;

  const subtitle = user.role === 'platform_owner' ? 'Platform Admin' : undefined;

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          ref={panelRef}
          side="left"
          style={{
            ...panelStyle,
            // Inline top/bottom beat Sheet's inset-y-0 / h-full and any padding merge issues.
            top: 'env(safe-area-inset-top, 0px)',
            bottom: 'env(safe-area-inset-bottom, 0px)',
            height: 'auto',
          }}
          overlayStyle={overlayStyle}
          className={cn(
            'flex w-[min(100vw-1rem,18rem)] max-w-xs flex-col gap-0 p-0 sm:p-0 touch-pan-y',
            panelClassName,
          )}
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SidebarBrand subtitle={subtitle} />
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-3 [&_a]:min-h-11 [&_a]:py-2.5 [&_a]:text-[0.9375rem] [&_button]:min-h-11">
            <SidebarNav onNavigate={close} mobile />
            <div className="mt-auto border-t border-stone-200 pt-4 dark:border-stone-800">
              <ReferAFriendTrigger
                mobile
                onClick={() => {
                  close();
                  setReferOpen(true);
                }}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <ReferAFriendDialog open={referOpen} onOpenChange={setReferOpen} />
    </>
  );
}
