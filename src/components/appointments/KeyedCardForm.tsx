import { CreditCard, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { KeyedPaymentSession } from '@/lib/stripe-keyed';
import { cn, formatCurrency } from '@/lib/utils';
import { sectionMutedClass } from '@/components/common/Panel';
import { Button } from '@/components/ui/button';

interface KeyedCardFormProps {
  session: KeyedPaymentSession;
  totalCents: number;
  onSuccess: () => void;
}

/** Stripe Payment Element form used when the card reader is unavailable or failed. */
export function KeyedCardForm({ session, totalCents, onSuccess }: KeyedCardFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Use unmount (not destroy) so React Strict Mode remounts can reuse the same Element.
    session.mount(container);
    return () => session.unmount();
  }, [session]);

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      await session.confirm();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Card payment failed');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
      <p className={cn('text-sm', sectionMutedClass)}>Enter the card details to charge manually.</p>
      <div ref={containerRef} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button
        type="button"
        size="lg"
        className="h-12 w-full text-base"
        onClick={handleConfirm}
        disabled={confirming}
      >
        {confirming ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
        Charge {formatCurrency(totalCents)}
      </Button>
    </section>
  );
}
