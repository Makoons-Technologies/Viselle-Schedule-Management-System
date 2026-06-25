import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { panelClassName } from '@/components/common/Panel';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className={cn(
        panelClassName,
        'flex flex-col items-center justify-center border-dashed px-6 py-16 text-center dark:border-stone-700',
      )}
    >
      <div className="mb-4 rounded-full bg-brand-50 p-3 dark:bg-brand-950/50">
        <Icon className="h-6 w-6 text-brand-600 dark:text-brand-300" />
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
