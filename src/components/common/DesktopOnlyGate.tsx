import type { ReactNode } from 'react';
import { Monitor } from 'lucide-react';

export function DesktopOnlyGate({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center md:hidden dark:border-stone-800 dark:bg-stone-900">
        <Monitor className="mx-auto mb-3 h-8 w-8 text-brand-600" />
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{title}</h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{description}</p>
        <p className="mt-3 text-sm font-medium text-stone-800 dark:text-stone-200">
          Open this page on a computer to continue.
        </p>
      </div>
      <div className="hidden md:block">{children}</div>
    </>
  );
}
