/**
 * Apple/Chrome Strong Password often fills both new-password fields in the DOM,
 * but only the first fires React onChange. A controlled confirm field then
 * re-renders from stale "" and wipes the autofilled value.
 *
 * Returns the confirm value to apply, or null if confirm should be left alone.
 */
export function confirmPasswordAfterPasswordChange(options: {
  nextPassword: string;
  previousPassword: string;
  confirmState: string;
  confirmDomValue: string;
}): string | null {
  const { nextPassword, previousPassword, confirmState, confirmDomValue } = options;

  if (confirmDomValue === nextPassword && confirmDomValue.length > 0) {
    return confirmDomValue;
  }

  // Strong Password inserts the whole value at once; mirror into an empty confirm.
  const bulkInsert =
    nextPassword.length >= 8 && nextPassword.length - previousPassword.length > 1;
  if (bulkInsert && confirmState.length === 0) {
    return nextPassword;
  }

  return null;
}
