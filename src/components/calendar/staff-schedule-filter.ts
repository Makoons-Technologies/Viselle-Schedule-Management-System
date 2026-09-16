/** Shared label + first-load default for the desktop staff schedule picker. */

export type StaffScheduleAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
};

export function accountDisplayName(account: StaffScheduleAccount): string {
  return `${account.firstName} ${account.lastName}`.trim() || account.email;
}

/** Name shown in the dropdown / trigger, with `(me)` on the current user. */
export function staffScheduleLabel(
  account: StaffScheduleAccount,
  meAccountId?: string | null,
): string {
  const name = accountDisplayName(account);
  return meAccountId && account.id === meAccountId ? `${name} (me)` : name;
}

export function staffScheduleTriggerLabel(params: {
  accounts: StaffScheduleAccount[];
  selectedIds: string[];
  meAccountId?: string | null;
}): string {
  const { accounts, selectedIds, meAccountId } = params;
  if (accounts.length === 0) return 'Schedules';

  const selectedSet = new Set(selectedIds);
  const allSelected = accounts.every((account) => selectedSet.has(account.id));
  if (allSelected) return 'All schedules';
  if (selectedIds.length === 0) return 'No schedules';
  if (selectedIds.length === 1) {
    const only = accounts.find((account) => account.id === selectedIds[0]);
    return only ? staffScheduleLabel(only, meAccountId) : '1 schedule';
  }
  return `${selectedIds.length} schedules`;
}

/**
 * Who "me" is for the calendar filter.
 * Session account wins; impersonation / preview falls back to the org owner.
 */
export function resolveMyAccountId(input: {
  userAccountId?: string | null;
  memberships?: Array<{ organizationId: string; accountId: string }>;
  orgId?: string | null;
  accounts?: Array<{ id: string; role: string }>;
}): string | null {
  if (input.userAccountId) return input.userAccountId;
  if (input.orgId && input.memberships) {
    const membership = input.memberships.find((item) => item.organizationId === input.orgId);
    if (membership?.accountId) return membership.accountId;
  }
  const owner = input.accounts?.find((account) => account.role === 'org_owner');
  return owner?.id ?? null;
}

/** First-load desktop selection: current user (or previewed owner) only. */
export function defaultSelectedStaffIds(meAccountId?: string | null): string[] {
  return meAccountId ? [meAccountId] : [];
}

/**
 * Bookable staff for the desktop picker, always including "me" so the default
 * and `(me)` label work when the signed-in / previewed owner is not bookable.
 */
export function staffAccountsForFilter<T extends { id: string; status: string; isBookable: boolean }>(
  accounts: T[],
  meAccountId?: string | null,
): T[] {
  const bookable = accounts.filter((account) => account.status === 'active' && account.isBookable);
  const me = meAccountId ? accounts.find((account) => account.id === meAccountId) : undefined;
  if (me && !bookable.some((account) => account.id === me.id)) {
    return [...bookable, me];
  }
  return bookable;
}
