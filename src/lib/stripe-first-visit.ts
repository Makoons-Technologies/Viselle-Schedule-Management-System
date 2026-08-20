import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { intentIdFromClientSecret } from '@/lib/first-visit-protection';

export type FirstVisitIntentType = 'payment' | 'setup';

export interface FirstVisitCardSession {
  intentId: string;
  intentType: FirstVisitIntentType;
  mount: (el: HTMLElement) => void;
  unmount: () => void;
  confirm: () => Promise<{ intentId: string; intentType: FirstVisitIntentType }>;
  destroy: () => void;
}

/**
 * Payment Element session for a public first-visit deposit (PaymentIntent)
 * or card-on-file hold (SetupIntent) on a Stripe Connect account.
 */
export async function createFirstVisitCardSession(params: {
  clientSecret: string;
  intentType: FirstVisitIntentType;
  stripeAccountId: string;
  publishableKey?: string | null;
}): Promise<FirstVisitCardSession> {
  const publishableKey =
    params.publishableKey?.trim() ||
    (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim();
  if (!publishableKey) {
    throw new Error('Card collection is not configured. The API must return a Stripe publishable key.');
  }

  const { loadStripe } = await import('@stripe/stripe-js');
  const stripe: Stripe | null = await loadStripe(publishableKey, {
    stripeAccount: params.stripeAccountId,
  });
  if (!stripe) {
    throw new Error('Stripe failed to load');
  }

  const elements: StripeElements = stripe.elements({ clientSecret: params.clientSecret });
  const paymentElement = elements.create('payment');
  let destroyed = false;
  const fallbackIntentId = intentIdFromClientSecret(params.clientSecret);

  return {
    intentId: fallbackIntentId,
    intentType: params.intentType,
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
      if (params.intentType === 'setup') {
        const { error, setupIntent } = await stripe.confirmSetup({
          elements,
          redirect: 'if_required',
        });
        if (error) {
          throw new Error(error.message ?? 'Could not save this card');
        }
        return {
          intentId: setupIntent?.id ?? fallbackIntentId,
          intentType: 'setup' as const,
        };
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (error) {
        throw new Error(error.message ?? 'Deposit payment failed');
      }
      return {
        intentId: paymentIntent?.id ?? fallbackIntentId,
        intentType: 'payment' as const,
      };
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      paymentElement.destroy();
    },
  };
}
