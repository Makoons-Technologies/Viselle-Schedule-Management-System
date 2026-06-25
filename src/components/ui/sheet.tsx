import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-white shadow-xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out dark:bg-stone-900',
  {
    variants: {
      side: {
        right: 'inset-y-0 right-0 h-full w-full max-w-md border-l border-stone-200 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right dark:border-stone-800',
        left: 'inset-y-0 left-0 h-full w-full max-w-xs border-r border-stone-200 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left dark:border-stone-800',
      },
    },
    defaultVariants: { side: 'right' },
  },
);

export const SheetContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & VariantProps<typeof sheetVariants>
>(({ side, className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
    <DialogPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), 'flex flex-col p-4 sm:p-6', className)} {...props}>
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = 'SheetContent';

export function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 pb-4', className)} {...props} />;
}

export function SheetTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold text-stone-900 dark:text-stone-100', className)}
      {...props}
    />
  );
}

export function SheetDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <DialogPrimitive.Description className={cn('text-sm text-stone-500 dark:text-stone-400', className)} {...props} />;
}
