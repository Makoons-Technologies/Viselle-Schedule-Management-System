import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { KeyedCardForm } from '@/components/appointments/KeyedCardForm';
import { BlockingProgressDialog } from '@/components/common/BlockingProgressDialog';
import { LoadingState } from '@/components/common/LoadingState';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { createKeyedPaymentSession, type KeyedPaymentSession } from '@/lib/stripe-keyed';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function PublicInvoicePage() {
  const { token = '' } = useParams<{ token: string }>();
  const [session, setSession] = useState<KeyedPaymentSession | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const invoiceQuery = useQuery({
    queryKey: ['public-invoice', token],
    queryFn: () => orgApi.getPublicInvoice(token),
    enabled: !!token,
  });

  const view = invoiceQuery.data;
  const isPaid = paid || view?.invoice.status === 'paid';
  const canPayOnline = Boolean(view && !isPaid && view.canPayOnline);

  const payPrepQuery = useQuery({
    queryKey: ['public-invoice-pay', token],
    queryFn: async () => {
      const started = await orgApi.startPublicInvoicePay(token);
      const keyed = await createKeyedPaymentSession({
        clientSecret: started.clientSecret,
        stripeAccountId: started.stripeAccountId,
        publishableKey: started.publishableKey,
      });
      return { started, keyed };
    },
    enabled: canPayOnline && !!token,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  useEffect(() => {
    if (!canPayOnline) {
      setSession((prev) => {
        prev?.destroy();
        return null;
      });
      setPaymentIntentId(null);
      return;
    }

    const prep = payPrepQuery.data;
    if (!prep) {
      setSession((prev) => {
        prev?.destroy();
        return null;
      });
      setPaymentIntentId(null);
      return;
    }

    setSession((prev) => {
      prev?.destroy();
      return prep.keyed;
    });
    setPaymentIntentId(prep.started.paymentIntentId);
  }, [canPayOnline, payPrepQuery.data]);

  useEffect(() => () => session?.destroy(), [session]);

  if (invoiceQuery.isLoading) return <LoadingState />;

  if (!view) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-semibold">Invoice unavailable</h1>
        <p className="mt-2 text-sm text-stone-500">This link is wrong or the invoice was removed.</p>
      </div>
    );
  }

  const payPrepError =
    payPrepQuery.isError && canPayOnline
      ? getApiErrorMessage(payPrepQuery.error, 'Could not load secure checkout')
      : null;

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-10">
      <p className="text-sm text-stone-500">{view.organizationName}</p>
      <div>
        <h1 className="text-2xl font-semibold">{isPaid ? 'Receipt' : 'Invoice'}</h1>
        <p className="mt-1 text-sm text-stone-500">{view.customerName}</p>
      </div>

      <div className="space-y-2 rounded-xl border border-stone-200 p-4 text-sm dark:border-stone-700">
        {view.invoice.lineItems.map((line) => (
          <div key={`${line.description}-${line.lineTotalCents}`} className="flex justify-between gap-3">
            <span>
              {line.description}
              {line.quantity > 1 ? ` × ${line.quantity}` : ''}
            </span>
            <span className="tabular-nums">{formatCurrency(line.lineTotalCents)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-semibold dark:border-stone-700">
          <span>{isPaid ? 'Paid' : 'Balance due'}</span>
          <span className="tabular-nums">{formatCurrency(view.invoice.amountCents)}</span>
        </div>
      </div>

      {isPaid && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>Payment received. Thank you — see you at your next visit.</p>
        </div>
      )}

      {!isPaid && !view.canPayOnline && (
        <p className="text-sm text-stone-500">Pay this balance at your next visit.</p>
      )}

      {!isPaid && canPayOnline && payPrepQuery.isLoading && (
        <p className="text-sm text-stone-500">Preparing secure checkout…</p>
      )}

      {payPrepError && (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-red-800 dark:text-red-200">{payPrepError}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void payPrepQuery.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {session && paymentIntentId && !isPaid && canPayOnline && (
        <KeyedCardForm
          session={{
            ...session,
            confirm: async () => {
              await session.confirm();
              await orgApi.confirmPublicInvoicePay(token, paymentIntentId);
            },
          }}
          totalCents={view.invoice.amountCents}
          description="Pay with Apple Pay, Google Pay, or enter your card details below."
          submitVerb="pay"
          onSuccess={() => {
            setPaid(true);
            setSession((prev) => {
              prev?.destroy();
              return null;
            });
            void invoiceQuery.refetch();
          }}
        />
      )}

      <BlockingProgressDialog
        open={payPrepQuery.isFetching && !payPrepQuery.data}
        title="Invoice"
        message="Preparing secure checkout…"
      />
    </div>
  );
}
