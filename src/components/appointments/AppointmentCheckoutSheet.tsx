import { useMutation, useQuery } from '@tanstack/react-query';
import { Banknote, ChevronLeft, CreditCard, Loader2, Minus, PackagePlus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { useCardCheckout } from '@/hooks/useCardCheckout';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { cn, formatCurrency } from '@/lib/utils';
import type { AppointmentInfo, CheckoutLineInput } from '@/types/api';
import { CardUnavailableHint } from '@/components/appointments/CardUnavailableHint';
import { CheckoutProductPickerDialog } from '@/components/appointments/CheckoutProductPickerDialog';
import { KeyedCardForm } from '@/components/appointments/KeyedCardForm';
import { isCardCheckoutReady } from '@/lib/stripe-connect-hint';
import { sectionHeadingClass, sectionMutedClass } from '@/components/common/Panel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const TIP_PRESETS = [0.15, 0.18, 0.2];

type TipSelection = 'none' | 'custom' | (typeof TIP_PRESETS)[number];
type CheckoutStep = 'items' | 'tip';

const CHECKOUT_STEPS: { id: CheckoutStep; label: string }[] = [
  { id: 'items', label: 'Order' },
  { id: 'tip', label: 'Card payment' },
];

interface AppointmentCheckoutSheetProps {
  orgId: string;
  appointmentInfo: AppointmentInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function CheckoutStepIndicator({ step }: { step: CheckoutStep }) {
  const stepIndex = CHECKOUT_STEPS.findIndex((item) => item.id === step);

  return (
    <div className="flex items-center gap-2">
      {CHECKOUT_STEPS.map((item, index) => {
        const active = item.id === step;
        const done = index < stepIndex;
        return (
          <div key={item.id} className="flex min-w-0 items-center gap-2">
            {index > 0 && <span className="text-stone-300 dark:text-stone-600">/</span>}
            <span
              className={cn(
                'truncate text-xs font-medium sm:text-sm',
                active && 'text-brand-700 dark:text-brand-300',
                done && !active && 'text-stone-600 dark:text-stone-300',
                !done && !active && 'text-stone-400 dark:text-stone-500',
              )}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AppointmentCheckoutSheet({
  orgId,
  appointmentInfo,
  open,
  onOpenChange,
  onSuccess,
}: AppointmentCheckoutSheetProps) {
  const { permissions } = useStaffPermissions(orgId);
  const canAddProducts = permissions.canAddCheckoutProducts;
  const [step, setStep] = useState<CheckoutStep>('items');
  const [lines, setLines] = useState<CheckoutLineInput[]>([]);
  const [tipCents, setTipCents] = useState(0);
  const [tipSelection, setTipSelection] = useState<TipSelection>('none');
  const [customTipDollars, setCustomTipDollars] = useState('');
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [cashConfirmOpen, setCashConfirmOpen] = useState(false);
  const customTipInputRef = useRef<HTMLInputElement>(null);

  const service = appointmentInfo?.service;
  const appointment = appointmentInfo?.appointment;

  useEffect(() => {
    if (open && service && appointment?.id) {
      setStep('items');
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
      setCashConfirmOpen(false);
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
    mutationFn: () => orgApi.checkoutCash(orgId, appointment!.id, { lines, tipCents: 0 }),
    onSuccess: () => {
      toast.success('Cash payment recorded');
      setCashConfirmOpen(false);
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

  const cardReady = isCardCheckoutReady(connectStatus);

  const completeCardPayment = useCallback(() => {
    toast.success('Card payment successful');
    onSuccess();
    onOpenChange(false);
  }, [onSuccess, onOpenChange]);

  const appointmentId = appointment?.id;

  const startTerminalCheckout = useCallback(
    () => orgApi.checkoutCard(orgId, appointmentId!, { lines, tipCents, mode: 'terminal' }),
    [orgId, appointmentId, lines, tipCents],
  );

  const startOnlineCheckout = useCallback(
    () => orgApi.checkoutCard(orgId, appointmentId!, { lines, tipCents, mode: 'online' }),
    [orgId, appointmentId, lines, tipCents],
  );

  const confirmPaymentIntent = useCallback(
    (paymentIntentId: string) =>
      orgApi.confirmCheckoutCard(orgId, appointmentId!, paymentIntentId),
    [orgId, appointmentId],
  );

  const card = useCardCheckout({
    active: open && step === 'tip' && !!appointment && !!previewQuery.data,
    orgId,
    startTerminalCheckout,
    startOnlineCheckout,
    confirmPaymentIntent,
    publishableKey: connectStatus?.publishableKey,
    onSuccess: completeCardPayment,
  });

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

  const goBack = () => {
    if (step === 'tip') {
      setStep('items');
    }
  };

  const renderLineItem = (
    line: (typeof previewLines)[number],
    options: { editable: boolean },
  ) => (
    <div
      key={
        line.lineType === 'product'
          ? `product-${line.productId}`
          : `service-${line.serviceId ?? line.description}`
      }
      className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-800"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-stone-900 dark:text-stone-100">{line.description}</p>
        {line.quantity > 1 && (
          <p className={cn('text-xs', sectionMutedClass)}>
            {formatCurrency(line.unitPriceCents)} each
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {options.editable && line.lineType === 'product' && line.productId ? (
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
            <span className="w-6 text-center text-sm font-medium tabular-nums">{line.quantity}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={(() => {
                const product = products.find((item) => item.id === line.productId);
                return !!product?.trackInventory && line.quantity >= product.stockQuantity;
              })()}
              onClick={() => adjustProductQuantity(line.productId!, 1)}
              aria-label={`Add one ${line.description}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <span className="text-sm text-stone-500 dark:text-stone-400">× {line.quantity}</span>
        )}
        <span className="min-w-[4rem] text-right font-semibold tabular-nums">
          {formatCurrency(line.lineTotalCents)}
        </span>
      </div>
    </div>
  );

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
            <CheckoutStepIndicator step={step} />
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {previewQuery.isLoading && (
              <div className="flex items-center justify-center py-16 text-stone-500 dark:text-stone-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading checkout…
              </div>
            )}

            {!previewQuery.isLoading && step === 'items' && (
              <div className="space-y-5">
                <section>
                  <h4 className={cn('mb-2', sectionHeadingClass)}>Order</h4>
                  <p className={cn('mb-3', sectionMutedClass)}>
                    Review the service and add any retail products for this sale.
                  </p>
                  {previewLines.length > 0 ? (
                    <div className="space-y-2">{previewLines.map((line) => renderLineItem(line, { editable: canAddProducts }))}</div>
                  ) : (
                    <p className={cn('rounded-lg border border-dashed border-stone-200 px-4 py-8 text-center text-sm dark:border-stone-700', sectionMutedClass)}>
                      No line items yet.
                    </p>
                  )}
                </section>

                {canAddProducts && (
                <section>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setProductPickerOpen(true)}
                    disabled={products.length === 0}
                    className="w-full sm:w-auto"
                  >
                    <PackagePlus className="h-4 w-4" />
                    {productLineCount > 0
                      ? `Edit products (${productLineCount})`
                      : 'Add products'}
                  </Button>
                  {products.length === 0 && (
                    <p className={cn('mt-2 text-xs', sectionMutedClass)}>
                      No active products. Add products in Settings to sell retail at checkout.
                    </p>
                  )}
                </section>
                )}
              </div>
            )}

            {!previewQuery.isLoading && step === 'tip' && previewQuery.data && (
              <div className="mx-auto max-w-md space-y-6">
                <section className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm dark:border-stone-700 dark:bg-stone-900">
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

                <section>
                  <h4 className={cn('mb-3', sectionHeadingClass)}>Add a tip</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {TIP_PRESETS.map((pct) => (
                        <Button
                          key={pct}
                          type="button"
                          variant={tipSelection === pct ? 'default' : 'outline'}
                          className="h-11"
                          onClick={() => applyTipPreset(pct)}
                        >
                          {Math.round(pct * 100)}%
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant={tipSelection === 'custom' ? 'default' : 'outline'}
                        className="h-11"
                        onClick={selectCustomTip}
                      >
                        Custom
                      </Button>
                    </div>
                    {tipSelection === 'custom' && (
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
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-stone-500"
                      onClick={() => {
                        setTipSelection('none');
                        setTipCents(0);
                        setCustomTipDollars('');
                      }}
                    >
                      No tip
                    </Button>
                  </div>
                </section>

                {card.cardMode === 'reader' ? (
                  <section className="space-y-4 rounded-xl border border-stone-200 p-5 text-center dark:border-stone-700">
                    <div className="flex flex-col items-center gap-3">
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950/40">
                        {card.reading && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-200 opacity-60 dark:bg-brand-800" />
                        )}
                        <CreditCard className="relative h-6 w-6 text-brand-600 dark:text-brand-300" />
                      </span>
                      <p className="text-base font-semibold">
                        {card.status ?? `Waiting for card — ${formatCurrency(totalCents)}`}
                      </p>
                      <p className={cn('text-sm', sectionMutedClass)}>
                        Have the customer tap, insert, or swipe on the reader.
                      </p>
                    </div>
                    {card.error && (
                      <p className="text-sm text-red-600 dark:text-red-400">{card.error}</p>
                    )}
                    {card.manualEntryAvailable ? (
                      <Button type="button" variant="outline" className="w-full" onClick={card.useManual}>
                        Enter card details manually
                      </Button>
                    ) : null}
                  </section>
                ) : (
                  <section className="space-y-3">
                    {card.keyedSession ? (
                      <KeyedCardForm
                        session={card.keyedSession}
                        totalCents={totalCents}
                        onSuccess={completeCardPayment}
                      />
                    ) : card.manualPreparing ? (
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 py-10 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparing secure card form…
                      </div>
                    ) : null}
                    {card.error && (
                      <p className="text-center text-sm text-red-600 dark:text-red-400">{card.error}</p>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-stone-500"
                      onClick={card.useReader}
                    >
                      Use card reader instead
                    </Button>
                  </section>
                )}
              </div>
            )}
          </div>

          {step !== 'tip' && (
            <footer className="shrink-0 border-t border-stone-200 bg-white px-6 py-4 dark:border-stone-800 dark:bg-stone-900">
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                {previewQuery.data && (
                  <p className="text-sm font-medium tabular-nums text-stone-900 dark:text-stone-100">
                    Subtotal {formatCurrency(previewQuery.data.subtotalCents)}
                  </p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCashConfirmOpen(true)}
                    disabled={!previewQuery.data || previewQuery.isLoading || cashMutation.isPending}
                  >
                    <Banknote className="h-4 w-4" />
                    Pay with cash
                  </Button>
                  <div className="flex flex-col gap-1.5">
                    {!cardReady && (
                      <CardUnavailableHint
                        orgId={orgId}
                        connectStatus={connectStatus}
                        className="text-left sm:max-w-[16rem] sm:text-right"
                      />
                    )}
                    <Button
                      type="button"
                      onClick={() => setStep('tip')}
                      disabled={!previewQuery.data || previewQuery.isLoading || !cardReady}
                    >
                      <CreditCard className="h-4 w-4" />
                      {cardReady ? 'Pay with card' : 'Card unavailable'}
                    </Button>
                  </div>
                </div>
              </div>
            </footer>
          )}

          {step === 'tip' && (
            <footer className="shrink-0 border-t border-stone-200 bg-white px-6 py-4 dark:border-stone-800 dark:bg-stone-900">
              <Button type="button" variant="ghost" onClick={goBack} className="w-full sm:w-auto">
                <ChevronLeft className="h-4 w-4" />
                Back to order
              </Button>
            </footer>
          )}
        </div>
      </SheetContent>

      <CheckoutProductPickerDialog
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        products={products}
        quantitiesByProductId={productQuantities}
        onSetProductQuantity={setProductQuantity}
      />

      <Dialog open={cashConfirmOpen} onOpenChange={setCashConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm cash payment</DialogTitle>
            <DialogDescription>
              Mark this sale as paid in cash for{' '}
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                {formatCurrency(subtotalCents)}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCashConfirmOpen(false)}
              disabled={cashMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => cashMutation.mutate()}
              disabled={cashMutation.isPending}
            >
              {cashMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Banknote className="h-4 w-4" />
              )}
              Confirm paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
