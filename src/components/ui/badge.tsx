import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
        secondary: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
        success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
        destructive: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
        outline: 'border border-stone-300 text-stone-700 dark:border-stone-600 dark:text-stone-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
