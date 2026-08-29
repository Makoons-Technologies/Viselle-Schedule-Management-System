/** Staging frontend / staging API only. Production viselle.net must never match. */
export function isStagingApp(): boolean {
  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? '').toLowerCase();
  if (apiBase.includes('staging-api.viselle.net')) return true;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'staging.viselle.net' || host.endsWith('.staging.viselle.net')) return true;
  }

  return false;
}

/** Shop-facing copy for the org text setting. Do not mention A2P or production SMS. */
export const CLIENT_TEXTS_HELPER =
  'Texts are for appointment updates — booked, changed, or cancelled — plus a reminder before the visit.';

/** Shown while outbound SMS is paused (production A2P / carrier review). Hidden on staging. */
export const SMS_UNDER_REVIEW_NOTICE =
  'Text messages are paused while our phone number is under carrier (A2P) review. Email reminders still go out. Texts will be available once the number is approved.';

export const SMS_UNDER_REVIEW_OPT_IN_NOTE =
  'Texts are paused during carrier review. You can still opt in — reminders will start after the number is approved.';

/**
 * Whether the UI should treat outbound texts as available.
 * Staging is on so shops can opt into appointment texts; the API send path
 * (or a dry-run log) is what actually delivers. Production stays gated on
 * `smsSendingEnabled` from GET /organizations/:id/plan and owner settings.
 */
export function isSmsSendingEnabled(plan?: { smsSendingEnabled?: boolean } | null): boolean {
  if (isStagingApp()) return true;
  return plan?.smsSendingEnabled === true;
}
