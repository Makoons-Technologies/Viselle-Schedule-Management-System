import { ChevronDown } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Account } from '@/types/api';
import { staffScheduleLabel, staffScheduleTriggerLabel } from './staff-schedule-filter';

interface StaffScheduleFilterProps {
  accounts: Account[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  /** Signed-in staff (or previewed org owner). Shown with a `(me)` suffix. */
  meAccountId?: string | null;
}

export function StaffScheduleFilter({
  accounts,
  selectedIds,
  onSelectedIdsChange,
  meAccountId,
}: StaffScheduleFilterProps) {
  const accountIds = useMemo(() => accounts.map((account) => account.id), [accounts]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = accountIds.length > 0 && accountIds.every((id) => selectedSet.has(id));

  const triggerLabel = staffScheduleTriggerLabel({ accounts, selectedIds, meAccountId });

  const toggleAll = () => {
    onSelectedIdsChange(allSelected ? [] : accountIds);
  };

  const toggleOne = (accountId: string, checked: boolean) => {
    if (checked) {
      if (selectedSet.has(accountId)) return;
      onSelectedIdsChange([...selectedIds, accountId]);
      return;
    }
    onSelectedIdsChange(selectedIds.filter((id) => id !== accountId));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 font-normal text-stone-600 dark:text-stone-300"
          disabled={accounts.length === 0}
        >
          {triggerLabel}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Show schedules</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={allSelected}
          onCheckedChange={toggleAll}
          onSelect={(event) => event.preventDefault()}
          disabled={accounts.length === 0}
        >
          {allSelected ? 'Unselect all' : 'Select all'}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {accounts.map((account) => (
          <DropdownMenuCheckboxItem
            key={account.id}
            checked={selectedSet.has(account.id)}
            onCheckedChange={(checked) => toggleOne(account.id, checked === true)}
            onSelect={(event) => event.preventDefault()}
          >
            {staffScheduleLabel(account, meAccountId)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
