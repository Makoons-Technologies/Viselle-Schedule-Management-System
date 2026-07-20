import type { StripeConnectStatus } from '@/types/api';

export function isCardCheckoutReady(status: StripeConnectStatus | undefined): boolean {
  return Boolean(status?.chargesEnabled && status?.onboardingComplete);
}

export function getCardUnavailableHint(
  status: StripeConnectStatus | undefined,
  forAdmin: boolean,
): string {
  if (forAdmin) {
    if (!status?.accountId) {
      return 'Connect your salon\'s Stripe account to accept card payments.';
    }
    if (!status.onboardingComplete) {
      return 'Finish Stripe onboarding to enable card payments.';
    }
    if (!status.chargesEnabled) {
      return 'Stripe onboarding is complete, but card payments are still activating. Refresh your Stripe status.';
    }
    return 'Set up Stripe to accept card payments.';
  }

  if (!status?.accountId) {
    return 'Ask your organization owner to connect Stripe in Settings → Payments.';
  }
  if (!status.onboardingComplete) {
    return 'Ask your organization owner to finish Stripe onboarding in Settings → Payments.';
  }
  if (!status.chargesEnabled) {
    return 'Card payments are still activating. Ask your organization owner to refresh Stripe status in Settings → Payments.';
  }
  return 'Ask your organization owner to set up card payments in Settings → Payments.';
}
