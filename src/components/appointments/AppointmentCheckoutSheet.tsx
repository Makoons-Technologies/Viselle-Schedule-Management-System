import { useMutation, useQuery } from '@tanstack/react-query';
import { Banknote, CreditCard, Loader2, Minus, PackagePlus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { AppointmentInfo, CheckoutLineInput } from '@/types/api';
import { CheckoutProductPickerDialog } from '@/components/appointments/CheckoutProductPickerDialog';
import { sectionHeadingClass, sectionMutedClass } from '@/components/common/Panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const TIP_PRESETS = [0.15, 0.18, 0.2];

type TipSelection = 'none' | 'custom' | (typeof TIP_PRESETS)[number];

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
  const [tipSelection, setTipSelection] = useState<TipSelection>('none');
  const [customTipDollars, setCustomTipDollars] = useState('');
  const [cardProcessing, setCardProcessing] = useState(false);
  const [readerStatus, setReaderStatus] = useState<string | null>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const customTipInputRef = useRef<HTMLInputElement>(null);

  const service = appointmentInfo?.service;
  const appointment = appointmentInfo?.appointment;

  useEffect(() => {
    if (open && service && appointment?.id) {
      setLines([
        {
          lineType: 'service',
          serviceId: appointment.serviceId,
          quantity: 1,
        },
      ]);
      setTipCents(0);
      setTipSelection('none');
      setCustomTipDollars('');
      setProductPickerOpen(false);
    }
  }, [open, service, appointment?.id, appointment?.serviceId]);

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
    queryKey: ['checkout-preview', orgId, appointment?.id, lines],
    queryFn: () =>
      orgApi.previewCheckout(orgId, appointment!.id, { lines, tipCents: 0 }),
    enabled: open && !!appointment && lines.length > 0,
  });

  const subtotalCents = previewQuery.data?.subtotalCents ?? 0;
  const totalCents = subtotalCents + tipCents;

  useEffect(() => {
    if (typeof tipSelection === 'number' && subtotalCents > 0) {
      setTipCents(Math.round(subtotalCents * tipSelection));
    }
  }, [subtotalCents, tipSelection]);

  const applyTipPreset = useCallback(
    (pct: (typeof TIP_PRESETS)[number]) => {
      setTipSelection(pct);
      setCustomTipDollars('');
      setTipCents(Math.round(subtotalCents * pct));
    },
    [subtotalCents],
  );

  const selectCustomTip = useCallback(() => {
    setTipSelection('custom');
    requestAnimationFrame(() => customTipInputRef.current?.focus());
  }, []);

  const cashMutation = useMutation({
    mutationFn: () => orgApi.checkoutCash(orgId, appointment!.id, { lines, tipCents }),
    onSuccess: () => {
      toast.success('Payment recorded');
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setProductQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) => {
      const without = prev.filter(
        (line) => !(line.lineType === 'product' && line.productId === productId),
      );
      if (quantity <= 0) return without;
      return [...without, { lineType: 'product', productId, quantity }];
    });
  }, []);

  const cardReady = connectStatus?.chargesEnabled && connectStatus?.onboardingComplete;

  const handleCardPayment = async () => {
    if (!appointment || !previewQuery.data) return;
    setCardProcessing(true);
    setReaderStatus('Starting card payment…');

    let terminal: { disconnectReader: () => Promise<unknown> } | null = null;
    let connected = false;

    try {
      const cardResult = await orgApi.checkoutCard(orgId, appointment.id, { lines, tipCents });

      const { loadStripeTerminal } = await import('@stripe/terminal-js');
      const StripeTerminal = await loadStripeTerminal();
      if (!StripeTerminal) {
        throw new Error('Stripe Terminal failed to load');
      }

      terminal = StripeTerminal.create({
        onFetchConnectionToken: async () => {
          const { secret } = await orgApi.getTerminalConnectionToken(orgId);
          return secret;
        },
        onUnexpectedReaderDisconnect: () => {
          connected = false;
          toast.error('Card reader disconnected');
          setCardProcessing(false);
          setReaderStatus(null);
        },
      });

      setReaderStatus('Discovering readers…');
      const discover = await terminal.discoverReaders({ simulated: import.meta.env.DEV });
      if ('error' in discover) {
        throw new Error(discover.error.message);
      }
      const readers = discover.discoveredReaders;
      if (!readers?.length) {
        throw new Error(
          import.meta.env.DEV
            ? 'No readers found. Use a simulated reader in dev or register a reader in Settings → Payments.'
            : 'No card reader found. Register a reader in Settings → Payments.',
        );
      }

      setReaderStatus(`Connecting to ${readers[0].label ?? 'reader'}…`);
      const connect = await terminal.connectReader(readers[0]);
      if ('error' in connect) {
        throw new Error(connect.error.message);
      }
      connected = true;

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
      if (terminal && connected) {
        await terminal.disconnectReader().catch(() => undefined);
      }
      setCardProcessing(false);
      setReaderStatus(null);
    }
  };

  const previewLines = useMemo(() => previewQuery.data?.lines ?? [], [previewQuery.data?.lines]);
  const products = productsData?.products ?? [];

  const adjustProductQuantity = useCallback(
    (productId: string, delta: number) => {
      const current =
        lines.find((line) => line.lineType === 'product' && line.productId === productId)?.quantity ?? 0;
      const next = current + delta;
      if (next <= 0) {
        setProductQuantity(productId, 0);
        return;
      }
      const product = products.find((item) => item.id === productId);
      if (product?.trackInventory && next > product.stockQuantity) {
        toast.error(`Only ${product.stockQuantity} in stock`);
        return;
      }
      setProductQuantity(productId, next);
    },
    [lines, products, setProductQuantity],
  );

  const productQuantities = useMemo(() => {
    const quantities: Record<string, number> = {};
    for (const line of lines) {
      if (line.lineType === 'product' && line.productId) {
        quantities[line.productId] = line.quantity;
      }
    }
    return quantities;
  }, [lines]);
  const productLineCount = useMemo(
    () => Object.values(productQuantities).reduce((sum, qty) => sum + qty, 0),
    [productQuantities],
  );
  const customerName = appointmentInfo?.customer
    ? `${appointmentInfo.customer.firstName} ${appointmentInfo.customer.lastName}`
    : 'Complete sale';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          '!inset-0 !h-[100dvh] !w-full !max-w-none border-0 p-0',
          'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
          'sm:!max-w-none',
        )}
      >
        <div className="flex h-[100dvh] flex-col text-stone-900 dark:text-stone-100">
          <SheetHeader className="shrink-0 border-b border-stone-200 px-6 py-4 pr-14 dark:border-stone-800">
            <SheetTitle className="text-xl">Checkout</SheetTitle>
            <SheetDescription>{customerName}</SheetDescription>
          </SheetHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
            <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-5">
              <section>
                <h4 className={cn('mb-2', sectionHeadingClass)}>Line items</h4>
                <div className="space-y-2">
                  {previewLines.map((line) => (
                    <div
                      key={
                        line.lineType === 'product'
                          ? `product-${line.productId}`
                          : `service-${line.serviceId ?? line.description}`
                      }
                      className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
                    >
                      <span className="min-w-0 flex-1 truncate text-stone-900 dark:text-stone-100">
                        {line.description}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        {line.lineType === 'product' && line.productId ? (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              disabled={line.quantity <= 0}
                              onClick={() => adjustProductQuantity(line.productId!, -1)}
                              aria-label={`Remove one ${line.description}`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium tabular-nums">
                              {line.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              disabled={
                                (() => {
                                  const product = products.find((item) => item.id === line.productId);
                                  return (
                                    !!product?.trackInventory && line.quantity >= product.stockQuantity
                                  );
                                })()
                              }
                              onClick={() => adjustProductQuantity(line.productId!, 1)}
                              aria-label={`Add one ${line.description}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-stone-500 dark:text-stone-400">× {line.quantity}</span>
                        )}
                        <span className="min-w-[3.5rem] text-right font-medium tabular-nums">
                          {formatCurrency(line.lineTotalCents)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className={cn('mb-2', sectionHeadingClass)}>Products</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProductPickerOpen(true)}
                  disabled={products.length === 0}
                >
                  <PackagePlus className="h-4 w-4" />
                  {productLineCount > 0
                    ? `Edit products (${productLineCount})`
                    : 'Add products'}
                </Button>
              </section>

              <section>
                <h4 className={cn('mb-2', sectionHeadingClass)}>Tip</h4>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {TIP_PRESETS.map((pct) => (
                      <Button
                        key={pct}
                        type="button"
                        variant={tipSelection === pct ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => applyTipPreset(pct)}
                      >
                        {Math.round(pct * 100)}%
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant={tipSelection === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      onClick={selectCustomTip}
                    >
                      Custom
                    </Button>
                  </div>
                  {tipSelection === 'custom' && (
                    <div className="max-w-[12rem]">
                      <Input
                        ref={customTipInputRef}
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="Enter tip ($)"
                        value={customTipDollars}
                        onChange={(e) => {
                          setCustomTipDollars(e.target.value);
                          const dollars = parseFloat(e.target.value);
                          setTipCents(Number.isNaN(dollars) ? 0 : Math.round(dollars * 100));
                        }}
                      />
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="flex min-h-0 flex-col border-t border-stone-200 bg-stone-50 px-6 py-5 dark:border-stone-800 dark:bg-stone-950 lg:border-l lg:border-t-0">
              {previewQuery.data && (
                <section className="rounded-xl border border-stone-200 bg-white p-4 text-sm dark:border-stone-700 dark:bg-stone-900">
                  <div className={cn('flex justify-between', sectionMutedClass)}>
                    <span>Subtotal</span>
                    <span className="tabular-nums text-stone-900 dark:text-stone-100">
                      {formatCurrency(previewQuery.data.subtotalCents)}
                    </span>
                  </div>
                  <div className={cn('mt-2 flex justify-between', sectionMutedClass)}>
                    <span>Tip</span>
                    <span className="tabular-nums text-stone-900 dark:text-stone-100">
                      {formatCurrency(tipCents)}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-lg font-semibold dark:border-stone-700">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(totalCents)}</span>
                  </div>
                </section>
              )}

              {readerStatus && (
                <p className={cn('mt-3 text-center', sectionMutedClass)}>{readerStatus}</p>
              )}

              <div className="mt-auto flex flex-col gap-3 pt-5">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 text-base"
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
                <Button
                  size="lg"
                  className="h-12 text-base"
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
              </div>
            </aside>
          </div>
        </div>
      </SheetContent>

      <CheckoutProductPickerDialog
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        products={products}
        quantitiesByProductId={productQuantities}
        onSetProductQuantity={setProductQuantity}
      />
    </Sheet>
  );
};
