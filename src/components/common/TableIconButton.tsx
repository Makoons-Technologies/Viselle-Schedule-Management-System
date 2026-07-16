import type { LucideIcon } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const destructiveClass =
  'text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300';

export interface TableIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: LucideIcon;
  variant?: ButtonProps['variant'];
  destructive?: boolean;
  asChild?: boolean;
  children?: ReactNode;
}

export const TableIconButton = forwardRef<HTMLButtonElement, TableIconButtonProps>(
  (
    { icon: Icon, label, variant = 'outline', destructive, asChild, className, children, ...props },
    ref,
  ) => (
    <Button
      ref={ref}
      type={asChild ? undefined : 'button'}
      variant={variant}
      size="icon"
      asChild={asChild}
      aria-label={label}
      title={label}
      className={cn('h-8 w-8 shrink-0', destructive && destructiveClass, className)}
      {...props}
    >
      {asChild ? children : Icon ? <Icon className="h-4 w-4" /> : children}
    </Button>
  ),
);
TableIconButton.displayName = 'TableIconButton';

export function TableRowActions({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-nowrap items-center justify-end gap-1.5', className)} {...props} />;
}
