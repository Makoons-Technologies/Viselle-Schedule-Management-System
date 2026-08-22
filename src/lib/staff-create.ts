import type { Account } from '@/types/api';

/**
 * After Create returns Network Error / ERR_FAILED, the POST may still have
 * landed (QA: check-in succeeded server-side while the UI only saw Network Error).
 * Do not retry POST. Reconcile against GET /accounts instead.
 */
export function findReconciledStaffAccount(
  accounts: Account[],
  email: string,
  existingAccountIds: string[],
): Account | undefined {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return undefined;
  return accounts.find(
    (account) =>
      account.email.trim().toLowerCase() === wanted &&
      account.role !== 'org_owner' &&
      !existingAccountIds.includes(account.id),
  );
}
