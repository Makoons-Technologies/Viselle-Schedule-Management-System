import type { CustomerFieldChange } from '@/lib/customers';

interface CustomerFieldChangesListProps {
  changes: CustomerFieldChange[];
}

export function CustomerFieldChangesList({ changes }: CustomerFieldChangesListProps) {
  if (changes.length === 0) return null;

  return (
    <ul className="space-y-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/50">
      {changes.map((change) => (
        <li key={change.field} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
          <span className="shrink-0 font-medium text-stone-700 dark:text-stone-200">{change.label}</span>
          <span className="min-w-0 break-words text-stone-600 dark:text-stone-300">
            <span className="line-through decoration-stone-400/80">{change.from}</span>
            <span className="mx-1.5 text-stone-400" aria-hidden>
              →
            </span>
            <span className="font-medium text-stone-900 dark:text-stone-100">{change.to}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
