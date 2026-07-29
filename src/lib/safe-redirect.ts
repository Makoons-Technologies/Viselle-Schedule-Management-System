/** Navigate only to https Stripe hosts (blocks javascript:/data: open redirects). */
export function redirectToStripeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isStripe =
      parsed.protocol === 'https:' &&
      (host === 'stripe.com' || host.endsWith('.stripe.com'));
    if (!isStripe) return false;
    window.location.assign(parsed.toString());
    return true;
  } catch {
    return false;
  }
}
