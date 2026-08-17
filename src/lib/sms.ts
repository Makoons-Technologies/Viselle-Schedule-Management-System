/** Shown while outbound SMS is paused for A2P / carrier review. */
export const SMS_UNDER_REVIEW_NOTICE =
  'Text messages are paused while our phone number is under carrier (A2P) review. Email reminders still go out. Texts will be available once the number is approved.';

export const SMS_UNDER_REVIEW_OPT_IN_NOTE =
  'Texts are paused during carrier review. You can still opt in — reminders will start after the number is approved.';

export function isSmsSendingEnabled(plan?: { smsSendingEnabled?: boolean } | null): boolean {
  return plan?.smsSendingEnabled === true;
}
