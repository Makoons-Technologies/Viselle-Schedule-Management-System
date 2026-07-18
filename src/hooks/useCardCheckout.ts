import { useCallback, useEffect, useRef, useState } from 'react';
import { createKeyedPaymentSession, type KeyedPaymentSession } from '@/lib/stripe-keyed';
import { TerminalAbortError, collectTerminalPayment } from '@/lib/stripe-terminal';

export type CardMode = 'reader' | 'manual';

export interface CardCheckoutController {
  cardMode: CardMode;
  useReader: () => void;
  useManual: () => void;
  status: string | null;
  error: string | null;
  keyedSession: KeyedPaymentSession | null;
  /** True while the reader is being armed / awaiting a card. */
  reading: boolean;
  /** True while the manual Payment Element session is being prepared. */
  manualPreparing: boolean;
  manualEntryAvailable: boolean;
}

/**
 * Drives the card step of checkout. When active in `reader` mode it automatically
 * arms the Stripe Terminal reader and awaits a tap; it re-arms whenever the
 * `startTerminalCheckout` callback identity changes (i.e. the tip/total changed).
 * In `manual` mode it prepares a keyed Payment Element session instead.
 */
export function useCardCheckout(params: {
  active: boolean;
  orgId: string;
  startTerminalCheckout: () => Promise<{ clientSecret: string; paymentIntentId: string }>;
  startOnlineCheckout: () => Promise<{
    clientSecret: string;
    stripeAccountId: string;
    paymentIntentId: string;
  }>;
  confirmPaymentIntent: (paymentIntentId: string) => Promise<unknown>;
  publishableKey?: string | null;
  onSuccess: () => void;
}): CardCheckoutController {
  const {
    active,
    orgId,
    startTerminalCheckout,
    startOnlineCheckout,
    confirmPaymentIntent,
    publishableKey,
    onSuccess,
  } = params;
  const [cardMode, setCardMode] = useState<CardMode>('reader');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyedSession, setKeyedSession] = useState<KeyedPaymentSession | null>(null);
  const [reading, setReading] = useState(false);
  const [manualPreparing, setManualPreparing] = useState(false);
  const manualEntryAvailable = Boolean(publishableKey?.trim());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!active) {
      abortRef.current?.abort();
      setCardMode('reader');
      setStatus(null);
      setError(null);
      setReading(false);
      setManualPreparing(false);
      setKeyedSession((prev) => {
        prev?.destroy();
        return null;
      });
    }
  }, [active]);

  // Reader mode: arm the reader and await a tap. Re-arms when the total changes.
  useEffect(() => {
    if (!active || cardMode !== 'reader') return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      setReading(true);
      setError(null);
      setStatus('Connecting to card reader…');
      try {
        const { clientSecret, paymentIntentId } = await startTerminalCheckout();
        if (controller.signal.aborted) return;
        await collectTerminalPayment({
          orgId,
          clientSecret,
          onStatus: setStatus,
          onUnexpectedDisconnect: () => setStatus('Card reader disconnected — reconnecting…'),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        await confirmPaymentIntent(paymentIntentId);
        if (controller.signal.aborted) return;
        onSuccess();
      } catch (err) {
        if (controller.signal.aborted || err instanceof TerminalAbortError) return;
        setStatus(null);
        setError(err instanceof Error ? err.message : 'Card reader payment failed');
      } finally {
        if (!controller.signal.aborted) setReading(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, cardMode, orgId, startTerminalCheckout, confirmPaymentIntent, onSuccess]);

  // Manual mode: prepare a keyed Payment Element session. Recreated when total changes.
  useEffect(() => {
    if (!active || cardMode !== 'manual') return;

    let cancelled = false;
    setKeyedSession((prev) => {
      prev?.destroy();
      return null;
    });
    setError(null);
    setStatus(null);

    const timer = setTimeout(async () => {
      if (!publishableKey?.trim()) {
        setError(
          'Manual card entry is not configured. Add STRIPE_PUBLISHABLE_KEY to the backend .env file.',
        );
        return;
      }

      setManualPreparing(true);
      setError(null);
      try {
        const { clientSecret, stripeAccountId, paymentIntentId } = await startOnlineCheckout();
        if (cancelled) return;
        const stripeSession = await createKeyedPaymentSession({
          clientSecret,
          stripeAccountId,
          publishableKey,
        });
        const session: KeyedPaymentSession = {
          ...stripeSession,
          confirm: async () => {
            await stripeSession.confirm();
            await confirmPaymentIntent(paymentIntentId);
          },
        };
        if (cancelled) {
          session.destroy();
          return;
        }
        setKeyedSession(session);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Card entry is unavailable');
      } finally {
        if (!cancelled) setManualPreparing(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, cardMode, startOnlineCheckout, confirmPaymentIntent, publishableKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const useReader = useCallback(() => {
    setError(null);
    setCardMode('reader');
  }, []);

  const useManual = useCallback(() => {
    if (!manualEntryAvailable) return;
    abortRef.current?.abort();
    setError(null);
    setCardMode('manual');
  }, [manualEntryAvailable]);

  return {
    cardMode,
    useReader,
    useManual,
    status,
    error,
    keyedSession,
    reading,
    manualPreparing,
    manualEntryAvailable,
  };
}
