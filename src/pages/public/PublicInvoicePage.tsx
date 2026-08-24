import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyedCardForm } from '@/components/appointments/KeyedCardForm';
import { BlockingProgressDialog } from '@/components/common/BlockingProgressDialog';
import { LoadingState } from '@/components/common/LoadingState';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { createKeyedPaymentSession, type KeyedPaymentSession } from '@/lib/stripe-keyed';
import { formatCurrency } from '@/lib/utils';

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

  const startPay = useMutation({
    mutationFn: async () => {
      const started = await orgApi.startPublicInvoicePay(token);
      const keyed = await createKeyedPaymentSession({
        clientSecret: started.clientSecret,
        stripeAccountId: started.stripeAccountId,
        publishableKey: started.publishableKey,
      });
      return { started, keyed };
    },
    onSuccess: ({ started, keyed }) => {
      setSession((prev) => {
        prev?.destroy();
        return keyed;
      });
      setPaymentIntentId(started.paymentIntentId);
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Could not start payment')),
  });

  useEffect(() => () => session?.destroy(), [session]);

  if (invoiceQuery.isLoading) return <LoadingState />;
  const view = invoiceQuery.data;
  if (!view) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-semibold">Invoice unavailable</h1>
        <p className="mt-2 text-sm text-stone-500">This link is wrong or the invoice was removed.</p>
      </div>
    );
  }

  const isPaid = paid || view.invoice.status === 'paid';

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

      {!isPaid && view.canPayOnline && !session && (
        <button
          type="button"
          className="h-11 w-full rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700"
          disabled={startPay.isPending}
          onClick={() => startPay.mutate()}
        >
          {startPay.isPending ? 'Preparing…' : 'Pay now'}
        </button>
      )}
      <BlockingProgressDialog
        open={startPay.isPending}
        title="Invoice"
        message="Preparing secure card form…"
      />

      {!isPaid && !view.canPayOnline && (
        <p className="text-sm text-stone-500">Pay this balance at your next visit.</p>
      )}

      {session && paymentIntentId && !isPaid && (
        <KeyedCardForm
          session={{
            ...session,
            confirm: async () => {
              await session.confirm();
              await orgApi.confirmPublicInvoicePay(token, paymentIntentId);
            },
          }}
          totalCents={view.invoice.amountCents}
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
    </div>
  );
}
