import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Case-insensitive substring match across string parts. Empty query matches all. */
export function matchesSearch(query: string, ...parts: Array<string | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return parts
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
    .join(' ')
    .toLowerCase()
    .includes(q);
}

interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Optional status/role/etc. selects rendered to the left of search. */
  filters?: ReactNode;
  /** Optional action controls next to filters (e.g. toggles). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared list toolbar: optional filters on the left, search on the right.
 * Matches the appointments page layout for consistency across dashboards.
 */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  actions,
  className,
}: ListToolbarProps) {
  const hasLeading = Boolean(filters || actions);

  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {hasLeading ? (
        <div className="flex flex-wrap items-center gap-3">
          {filters}
          {actions}
        </div>
      ) : null}
      <div className={cn('relative w-full sm:max-w-xs', !hasLeading && 'sm:ml-auto')}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          className="pl-9"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
