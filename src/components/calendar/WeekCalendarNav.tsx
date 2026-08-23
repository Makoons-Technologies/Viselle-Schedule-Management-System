import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { panelClassName } from '@/components/common/Panel';
import { cn } from '@/lib/utils';

interface WeekCalendarNavProps {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function WeekCalendarNav({
  label,
  onPrevious,
  onNext,
  leading,
  trailing,
  className,
  compact = false,
}: WeekCalendarNavProps) {
  return (
    <div
      className={cn(
        compact
          ? 'flex min-w-0 shrink items-center gap-0.5'
          : 'mb-4 flex flex-col gap-3 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4',
        !compact && panelClassName,
        className,
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div
        className={cn(
          'flex min-w-0 items-center gap-1',
          compact ? 'flex-nowrap' : 'flex-wrap justify-center sm:ml-auto',
        )}
      >
        <div className="flex min-w-0 items-center justify-center gap-0.5">
          <Button
            variant="outline"
            size="icon"
            className={compact ? 'h-8 w-8 shrink-0' : undefined}
            onClick={onPrevious}
            title="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span
            className={cn(
              'text-center font-semibold tabular-nums',
              compact
                ? 'min-w-0 shrink truncate px-1 text-xs'
                : 'min-w-[10rem] px-2 text-sm',
            )}
          >
            {label}
          </span>
          <Button
            variant="outline"
            size="icon"
            className={compact ? 'h-8 w-8 shrink-0' : undefined}
            onClick={onNext}
            title="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {trailing}
      </div>
    </div>
  );
}
