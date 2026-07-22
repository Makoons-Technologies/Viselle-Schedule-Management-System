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

interface StaffScheduleFilterProps {
  accounts: Account[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}

function accountLabel(account: Account) {
  return `${account.firstName} ${account.lastName}`.trim() || account.email;
}

export function StaffScheduleFilter({
  accounts,
  selectedIds,
  onSelectedIdsChange,
}: StaffScheduleFilterProps) {
  const accountIds = useMemo(() => accounts.map((account) => account.id), [accounts]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = accountIds.length > 0 && accountIds.every((id) => selectedSet.has(id));
  const noneSelected = selectedIds.length === 0;

  const triggerLabel = (() => {
    if (accounts.length === 0) return 'Schedules';
    if (allSelected) return 'All schedules';
    if (noneSelected) return 'No schedules';
    if (selectedIds.length === 1) {
      const only = accounts.find((account) => account.id === selectedIds[0]);
      return only ? accountLabel(only) : '1 schedule';
    }
    return `${selectedIds.length} schedules`;
  })();

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
            {accountLabel(account)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
