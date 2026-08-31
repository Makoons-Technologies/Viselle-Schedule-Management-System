import type { Stripe, StripeElements, StripePaymentElementOptions } from '@stripe/stripe-js';
import { getStripeElementsAppearance } from '@/lib/stripe-appearance';

export interface KeyedPaymentSession {
  /** Mounts the Stripe Payment Element into the given container. */
  mount: (el: HTMLElement) => void;
  /** Removes the Element from the DOM; it can be mounted again later. */
  unmount: () => void;
  /** Confirms the payment with the entered card details. Throws Error(message) on failure. */
  confirm: () => Promise<void>;
  /** Permanently destroys the Element. Create a new session afterwards. */
  destroy: () => void;
}

/**
 * Creates a keyed (card-not-present) payment session against a Stripe Connect
 * account using the Payment Element. Used as the fallback when the Terminal
 * reader is unavailable or fails.
 */
export async function createKeyedPaymentSession(params: {
  clientSecret: string;
  stripeAccountId: string;
  publishableKey?: string | null;
}): Promise<KeyedPaymentSession> {
  const publishableKey =
    params.publishableKey?.trim() ||
    (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim();
  if (!publishableKey) {
    throw new Error(
      'Manual card entry is not configured. Add STRIPE_PUBLISHABLE_KEY to the backend .env file.',
    );
  }

  const { loadStripe } = await import('@stripe/stripe-js');
  const stripe: Stripe | null = await loadStripe(publishableKey, {
    stripeAccount: params.stripeAccountId,
  });
  if (!stripe) {
    throw new Error('Stripe failed to load');
  }

  const elements: StripeElements = stripe.elements({
    clientSecret: params.clientSecret,
    appearance: getStripeElementsAppearance(),
  });
  const paymentOptions: StripePaymentElementOptions = {
    layout: 'tabs',
    wallets: {
      applePay: 'auto',
      googlePay: 'auto',
    },
  };
  const paymentElement = elements.create('payment', paymentOptions);
  let destroyed = false;

  return {
    mount: (el: HTMLElement) => {
      if (destroyed) {
        throw new Error('Card form was destroyed. Prepare a new payment session.');
      }
      paymentElement.mount(el);
    },
    unmount: () => {
      if (destroyed) return;
      paymentElement.unmount();
    },
    confirm: async () => {
      if (destroyed) {
        throw new Error('Card form was destroyed. Prepare a new payment session.');
      }
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (error) {
        throw new Error(error.message ?? 'Card payment failed');
      }
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      paymentElement.destroy();
    },
  };
}
