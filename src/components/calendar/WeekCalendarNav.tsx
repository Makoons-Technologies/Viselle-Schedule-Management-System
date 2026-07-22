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
}

export function WeekCalendarNav({
  label,
  onPrevious,
  onNext,
  leading,
  trailing,
  className,
}: WeekCalendarNavProps) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4',
        panelClassName,
        className,
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:ml-auto">
        <div className="flex items-center justify-center gap-1">
          <Button variant="outline" size="icon" onClick={onPrevious} title="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[10rem] px-2 text-center text-sm font-semibold">
            {label}
          </span>
          <Button variant="outline" size="icon" onClick={onNext} title="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {trailing}
      </div>
    </div>
  );
}
