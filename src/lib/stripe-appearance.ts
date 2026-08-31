import type { Appearance } from '@stripe/stripe-js';

export function isDarkColorMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

/** Stripe Elements appearance tuned for Viselle light/dark UI. */
export function getStripeElementsAppearance(): Appearance {
  const dark = isDarkColorMode();
  return {
    theme: dark ? 'night' : 'stripe',
    variables: {
      colorPrimary: '#a84372',
      borderRadius: '8px',
    },
  };
}
