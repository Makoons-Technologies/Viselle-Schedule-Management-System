import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMobileNav } from '@/context/MobileNavContext';
import { useMobileDrawerGestures } from '@/hooks/useMobileDrawerGestures';
import {
  ReferAFriendDialog,
  ReferAFriendTrigger,
} from '@/components/layout/ReferAFriendPanel';
import { SidebarBrand, SidebarNav } from '@/components/layout/SidebarNav';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { PoweredByMakoons } from '@/components/common/PoweredByMakoons';
import { cn } from '@/lib/utils';

export function MobileSidebar() {
  const { user } = useAuth();
  const { open, setOpen, close } = useMobileNav();
  const [referOpen, setReferOpen] = useState(false);
  const { panelRef, panelStyle, panelClassName, overlayStyle, forceMount } = useMobileDrawerGestures(
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
          forceMount={forceMount || undefined}
          overlayClassName={
            forceMount
              ? 'data-[state=closed]:!opacity-100 !animate-none'
              : undefined
          }
          style={{
            ...panelStyle,
            // Pin to the measured app viewport (landscape-safe); inline styles beat sheet h-full/inset-y-0.
            top: 0,
            bottom: 'auto',
            height: 'var(--app-height, 100dvh)',
            maxHeight: 'var(--app-height, 100dvh)',
            // Full-bleed panel; top inset only — footer owns the bottom safe area so
            // Powered-by can sit lower without leaving a maroon gap under the sheet.
            paddingTop: 'var(--safe-area-top)',
          }}
          overlayStyle={overlayStyle}
          className={cn(
            'flex w-[min(100vw-1rem,18rem)] max-w-xs flex-col gap-0 overflow-hidden p-0 sm:p-0',
            panelClassName,
          )}
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SheetDescription className="sr-only">Organization navigation drawer</SheetDescription>
          <div className="shrink-0">
            <SidebarBrand subtitle={subtitle} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              data-mobile-drawer-scroll
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y p-3 [&_a]:min-h-11 [&_a]:py-2.5 [&_a]:text-[0.9375rem] [&_button]:min-h-11"
            >
              <SidebarNav onNavigate={close} mobile />
            </div>
            <div className="shrink-0 border-t border-stone-200 p-3 pt-4 dark:border-stone-800">
              <ReferAFriendTrigger
                mobile
                onClick={() => {
                  close();
                  setReferOpen(true);
                }}
              />
            </div>
          </div>
          <div
            className="shrink-0 border-t border-stone-200 px-4 pt-3 text-right dark:border-stone-800"
            style={{ paddingBottom: 'max(0.75rem, var(--safe-area-bottom))' }}
          >
            <PoweredByMakoons className="text-right" />
          </div>
        </SheetContent>
      </Sheet>
      <ReferAFriendDialog open={referOpen} onOpenChange={setReferOpen} />
    </>
  );
}
