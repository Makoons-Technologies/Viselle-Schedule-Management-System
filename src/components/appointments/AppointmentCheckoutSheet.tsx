import { useMutation, useQuery } from '@tanstack/react-query';
import { Banknote, CreditCard, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { AppointmentInfo, CheckoutLineInput, Product } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const TIP_PRESETS = [0.15, 0.18, 0.2];

interface AppointmentCheckoutSheetProps {
  orgId: string;
  appointmentInfo: AppointmentInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AppointmentCheckoutSheet({
  orgId,
  appointmentInfo,
  open,
  onOpenChange,
  onSuccess,
}: AppointmentCheckoutSheetProps) {
  const [lines, setLines] = useState<CheckoutLineInput[]>([]);
  const [tipCents, setTipCents] = useState(0);
  const [customTipDollars, setCustomTipDollars] = useState('');
  const [cardProcessing, setCardProcessing] = useState(false);
  const [readerStatus, setReaderStatus] = useState<string | null>(null);

  const service = appointmentInfo?.service;
  const appointment = appointmentInfo?.appointment;

  useEffect(() => {
    if (open && service && appointment) {
      setLines([
        {
          lineType: 'service',
          serviceId: appointment.serviceId,
          quantity: 1,
        },
      ]);
      setTipCents(0);
      setCustomTipDollars('');
    }
  }, [open, service, appointment]);

  const { data: productsData } = useQuery({
    queryKey: ['products', orgId, 'checkout'],
    queryFn: () => orgApi.listProducts(orgId, true),
    enabled: open && !!orgId,
  });

  const { data: connectStatus } = useQuery({
    queryKey: ['stripe-connect', orgId],
    queryFn: () => orgApi.getStripeConnectStatus(orgId),
    enabled: open && !!orgId,
  });

  const previewQuery = useQuery({
    queryKey: ['checkout-preview', orgId, appointment?.id, lines, tipCents],
    queryFn: () =>
      orgApi.previewCheckout(orgId, appointment!.id, { lines, tipCents }),
    enabled: open && !!appointment && lines.length > 0,
  });

  const subtotalCents = previewQuery.data?.subtotalCents ?? 0;

  const applyTipPreset = useCallback(
    (pct: number) => {
      const tip = Math.round(subtotalCents * pct);
      setTipCents(tip);
      setCustomTipDollars('');
    },
    [subtotalCents],
  );

  const cashMutation = useMutation({
    mutationFn: () => orgApi.checkoutCash(orgId, appointment!.id, { lines, tipCents }),
    onSuccess: () => {
      toast.success('Payment recorded');
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addProduct = (product: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.lineType === 'product' && l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.lineType === 'product' && l.productId === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [...prev, { lineType: 'product', productId: product.id, quantity: 1 }];
    });
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const cardReady = connectStatus?.chargesEnabled && connectStatus?.onboardingComplete;

  const handleCardPayment = async () => {
    if (!appointment || !previewQuery.data) return;
    setCardProcessing(true);
    setReaderStatus('Starting card payment…');

    try {
      const cardResult = await orgApi.checkoutCard(orgId, appointment.id, { lines, tipCents });

      const { loadStripeTerminal } = await import('@stripe/terminal-js');
      const StripeTerminal = await loadStripeTerminal();
      if (!StripeTerminal) {
        throw new Error('Stripe Terminal failed to load');
      }

      const terminal = StripeTerminal.create({
        onFetchConnectionToken: async () => {
          const { secret } = await orgApi.getTerminalConnectionToken(orgId);
          return secret;
        },
      });

      setReaderStatus('Discovering readers…');
      const discover = await terminal.discoverReaders({ simulated: import.meta.env.DEV });
      if ('error' in discover) {
        throw new Error(discover.error.message);
      }
      const readers = discover.discoveredReaders;
      if (!readers?.length) {
        throw new Error('No readers found. Register a reader in Payments settings.');
      }

      setReaderStatus(`Connecting to ${readers[0].label ?? 'reader'}…`);
      const connect = await terminal.connectReader(readers[0]);
      if ('error' in connect) {
        throw new Error(connect.error.message);
      }

      setReaderStatus('Present card to reader…');
      const collect = await terminal.collectPaymentMethod(cardResult.clientSecret);
      if ('error' in collect) {
        throw new Error(collect.error.message);
      }

      setReaderStatus('Processing…');
      const process = await terminal.processPayment(collect.paymentIntent);
      if ('error' in process) {
        throw new Error(process.error.message);
      }

      toast.success('Card payment successful');
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Card payment failed');
    } finally {
      setCardProcessing(false);
      setReaderStatus(null);
    }
  };

  const previewLines = useMemo(() => previewQuery.data?.lines ?? [], [previewQuery.data?.lines]);
  const products = productsData?.products ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Checkout</SheetTitle>
          <SheetDescription>
            {appointmentInfo?.customer
              ? `${appointmentInfo.customer.firstName} ${appointmentInfo.customer.lastName}`
              : 'Complete sale'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex-1 space-y-6">
          <section>
            <h4 className="mb-2 text-sm font-medium text-stone-500">Line items</h4>
            <div className="space-y-2">
              {previewLines.map((line, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm">
                  <span>
                    {line.description} × {line.quantity}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{formatCurrency(line.lineTotalCents)}</span>
                    {line.lineType === 'product' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {products.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-medium text-stone-500">Add products</h4>
              <div className="flex flex-wrap gap-2">
                {products.map((p) => (
                  <Button key={p.id} variant="outline" size="sm" onClick={() => addProduct(p)}>
                    <Plus className="h-3.5 w-3.5" /> {p.name}
                  </Button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h4 className="mb-2 text-sm font-medium text-stone-500">Tip</h4>
            <div className="flex flex-wrap gap-2">
              {TIP_PRESETS.map((pct) => (
                <Button
                  key={pct}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTipPreset(pct)}
                >
                  {Math.round(pct * 100)}%
                </Button>
              ))}
            </div>
            <div className="mt-2">
              <Label className="text-xs">Custom tip ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={customTipDollars}
                onChange={(e) => {
                  setCustomTipDollars(e.target.value);
                  const dollars = parseFloat(e.target.value);
                  setTipCents(Number.isNaN(dollars) ? 0 : Math.round(dollars * 100));
                }}
                className="mt-1"
              />
            </div>
          </section>

          {previewQuery.data && (
            <section className="rounded-lg bg-stone-50 p-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(previewQuery.data.subtotalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tip</span>
                <span>{formatCurrency(previewQuery.data.tipCents)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(previewQuery.data.totalCents)}</span>
              </div>
            </section>
          )}

          {readerStatus && (
            <p className="text-center text-sm text-stone-500">{readerStatus}</p>
          )}

          <div className="flex flex-col gap-3 pb-4">
            <Button
              size="lg"
              className="h-14 text-base"
              onClick={() => cashMutation.mutate()}
              disabled={!previewQuery.data || cashMutation.isPending || cardProcessing}
            >
              {cashMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Banknote className="h-5 w-5" />
              )}
              Pay with cash
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 text-base"
              onClick={handleCardPayment}
              disabled={!previewQuery.data || !cardReady || cardProcessing || cashMutation.isPending}
            >
              {cardProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
              {cardReady ? 'Pay with card' : 'Connect Stripe for card payments'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
