import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AvailabilityRule } from '@/types/api';
import {
  formatAvailabilityTime,
  rulesForDay,
} from '@/lib/availability';
import { DAY_NAMES } from '@/lib/utils';
import { AddAvailabilityDialog } from '@/components/availability/AddAvailabilityDialog';
import { buildDayOfWeekColumns, WeekCalendarTable } from '@/components/calendar/WeekCalendarTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';

interface AvailabilityWeekCalendarProps {
  rules: AvailabilityRule[];
  readOnly?: boolean;
  onAdd?: (data: { dayOfWeek: number; startTime: string; endTime: string }) => void | Promise<void>;
  onRemove?: (ruleId: string) => void;
  adding?: boolean;
  removingRuleId?: string | null;
}

export function AvailabilityWeekCalendar({
  rules,
  readOnly = false,
  onAdd,
  onRemove,
  adding = false,
  removingRuleId = null,
}: AvailabilityWeekCalendarProps) {
  const [addDay, setAddDay] = useState<number | null>(null);
  const [ruleToRemove, setRuleToRemove] = useState<AvailabilityRule | null>(null);

  const activeRules = useMemo(() => rules.filter((rule) => rule.isActive), [rules]);
  const columns = useMemo(() => buildDayOfWeekColumns(), []);

  return (
    <>
      <WeekCalendarTable
        columns={columns}
        renderCell={(column) => {
          const dayOfWeek = Number(column.key);
          const dayRules = rulesForDay(activeRules, dayOfWeek);

          return (
            <>
              {dayRules.length === 0 ? (
                <p className="py-4 text-center text-xs text-stone-400 dark:text-stone-500">No hours set</p>
              ) : (
                dayRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="w-full rounded-lg border border-brand-200 border-l-[3px] border-l-brand-500 bg-brand-50 px-2.5 py-2 text-xs text-brand-950 shadow-sm dark:border-brand-800 dark:border-l-brand-400 dark:bg-brand-950/50 dark:text-brand-100"
                  >
                    <p className="font-semibold tabular-nums">
                      {formatAvailabilityTime(rule.startTime)} – {formatAvailabilityTime(rule.endTime)}
                    </p>
                    {!readOnly && onRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-7 px-2 text-brand-800 hover:bg-brand-100 hover:text-red-700 dark:text-brand-200 dark:hover:bg-brand-900/60 dark:hover:text-red-400"
                        onClick={() => setRuleToRemove(rule)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))
              )}
              {!readOnly && onAdd && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto w-full shrink-0 justify-center self-stretch text-stone-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                  onClick={() => setAddDay(dayOfWeek)}
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  Add hours
                </Button>
              )}
            </>
          );
        }}
      />

      {!readOnly && onAdd && (
        <AddAvailabilityDialog
          open={addDay !== null}
          onOpenChange={(open) => !open && setAddDay(null)}
          dayOfWeek={addDay}
          existingRules={activeRules}
          loading={adding}
          onSubmit={async (data) => {
            await onAdd(data);
            setAddDay(null);
          }}
        />
      )}

      {!readOnly && onRemove && (
        <ConfirmDialog
          open={!!ruleToRemove}
          onOpenChange={(open) => !open && setRuleToRemove(null)}
          title="Remove availability block?"
          description={
            ruleToRemove
              ? `Remove ${DAY_NAMES[ruleToRemove.dayOfWeek]} ${formatAvailabilityTime(ruleToRemove.startTime)}–${formatAvailabilityTime(ruleToRemove.endTime)}?`
              : ''
          }
          confirmLabel="Remove Block"
          destructive
          loading={removingRuleId === ruleToRemove?.id}
          onConfirm={() => {
            if (ruleToRemove) {
              onRemove(ruleToRemove.id);
              setRuleToRemove(null);
            }
          }}
        />
      )}
    </>
  );
}
