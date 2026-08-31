import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ALL_SCHEDULES, MY_SCHEDULE } from '@/hooks/useMobileScheduleView';
import type { Account } from '@/types/api';

interface MobileScheduleFilterProps {
  /** Current scope: 'all' | 'me' | an account id. */
  value: string;
  onValueChange: (value: string) => void;
  /** The signed-in user's own account, when known (used for the "(me)" entry). */
  myAccount: Account | null;
  /** Everyone else's bookable schedules, sorted, excluding the current user. */
  otherAccounts: Account[];
}

function accountName(account: Account) {
  return `${account.firstName} ${account.lastName}`.trim() || account.email;
}

function firstNameOf(account: Account) {
  return account.firstName.trim() || accountName(account);
}

export function MobileScheduleFilter({
  value,
  onValueChange,
  myAccount,
  otherAccounts,
}: MobileScheduleFilterProps) {
  const triggerLabel = (() => {
    if (value === ALL_SCHEDULES) return 'All';
    if (value === MY_SCHEDULE) return myAccount ? firstNameOf(myAccount) : 'Me';
    const other = otherAccounts.find((account) => account.id === value);
    return other ? firstNameOf(other) : 'Schedule';
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 min-w-0 max-w-[7.5rem] gap-1 px-2 font-normal text-stone-600 dark:text-stone-300"
          aria-label="Whose appointments to show"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Show appointments</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          <DropdownMenuRadioItem value={ALL_SCHEDULES}>All appointments</DropdownMenuRadioItem>
          {myAccount ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuRadioItem value={MY_SCHEDULE}>
                {accountName(myAccount)} (me)
              </DropdownMenuRadioItem>
            </>
          ) : null}
          {otherAccounts.map((account) => (
            <DropdownMenuRadioItem key={account.id} value={account.id}>
              {accountName(account)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
