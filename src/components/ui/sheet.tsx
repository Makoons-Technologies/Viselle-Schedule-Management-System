import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-white shadow-xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out dark:bg-stone-900',
  {
    variants: {
      side: {
        right:
          'inset-y-0 right-0 h-full w-full max-w-md border-l border-stone-200 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right dark:border-stone-800',
        left:
          'inset-y-0 left-0 h-full w-full max-w-xs border-r border-stone-200 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left dark:border-stone-800',
      },
    },
    defaultVariants: { side: 'right' },
  },
);

type SheetContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
  VariantProps<typeof sheetVariants> & {
    overlayClassName?: string;
    overlayStyle?: CSSProperties;
  };

export const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side, className, children, overlayClassName, overlayStyle, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          overlayClassName,
        )}
        style={overlayStyle}
      />
      <DialogPrimitive.Content
        ref={ref}
        // Keep `fixed` from sheetVariants. `relative` here is merged away by
        // tailwind-merge and drops `fixed`, so the portaled panel sits after
        // #root and is clipped by html.app-shell overflow — a blank overlay.
        className={cn(
          sheetVariants({ side }),
          'z-[51] flex flex-col px-4 pt-safe-add-4 pb-safe-add-4 sm:px-6 sm:pt-safe-add-6 sm:pb-safe-add-6',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-[calc(1rem+var(--safe-area-top))] rounded-md p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
);
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
  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-stone-500 dark:text-stone-400', className)}
      {...props}
    />
  );
}
