import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const panelClassName =
  'rounded-xl border border-stone-200 bg-white text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100';

export const sectionHeadingClass = 'text-sm font-medium text-stone-900 dark:text-stone-100';

export const sectionMutedClass = 'text-sm text-stone-500 dark:text-stone-300';

export const helperTextClass = 'text-xs text-stone-500 dark:text-stone-300';

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(panelClassName, className)} {...props} />;
}
