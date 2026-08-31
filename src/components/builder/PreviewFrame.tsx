import { Monitor, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PreviewMode = 'full' | 'mobile';

export function PreviewModeToggle({
  value,
  onChange,
}: {
  value: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}) {
  return (
    <div
      className="inline-flex h-9 items-center gap-1 rounded-lg bg-stone-100 p-1 dark:bg-stone-800"
      role="tablist"
      aria-label="Preview size"
    >
      {(
        [
          { mode: 'full', label: 'Full', icon: Monitor },
          { mode: 'mobile', label: 'Mobile', icon: Smartphone },
        ] as const
      ).map((option) => {
        const selected = value === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            role="tab"
            aria-selected={selected}
            title={`${option.label} preview`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
              selected
                ? 'bg-white text-brand-700 shadow-sm dark:bg-stone-950 dark:text-brand-300'
                : 'text-stone-600 dark:text-stone-300',
            )}
            onClick={() => onChange(option.mode)}
          >
            <option.icon className="h-3.5 w-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function PreviewFrame({ mode, children }: { mode: PreviewMode; children: ReactNode }) {
  if (mode === 'mobile') {
    return (
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border border-stone-200 p-4 dark:border-stone-800">
        {children}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-stone-200 p-6 dark:border-stone-800">
      {children}
    </div>
  );
}
