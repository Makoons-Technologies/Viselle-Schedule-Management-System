import { useMutation, useQuery } from '@tanstack/react-query';
import { Banknote, ChevronLeft, CreditCard, Gift, Loader2, Minus, PackagePlus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getApiErrorMessage, isRequestAborted, orgApi } from '@/lib/api';
import { BlockingProgressDialog, useBlockingProgress } from '@/components/common/BlockingProgressDialog';
import { formatCreditCount } from '@/lib/credits';
import { useCardCheckout } from '@/hooks/useCardCheckout';
import { useProtectSheetFromNestedOverlays } from '@/hooks/useProtectSheetFromNestedOverlays';
import { cn, formatCurrency } from '@/lib/utils';
import type { BatchCheckoutAppointmentInput, CheckoutLineInput } from '@/types/api';
import { CardUnavailableHint } from '@/components/appointments/CardUnavailableHint';
import { CheckoutProductPickerDialog } from '@/components/appointments/CheckoutProductPickerDialog';
import { ReceiptChoiceDialog } from '@/components/receipts/ReceiptChoiceDialog';
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

export interface BatchCheckoutItem {
  appointmentId: string;
  serviceId: string;
  customerName: string;
  serviceName: string;
}

interface BatchCheckoutSheetProps {
  orgId: string;
  items: BatchCheckoutItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BatchCheckoutSheet({ orgId, items, open, onOpenChange, onSuccess }: BatchCheckoutSheetProps) {
  const [step, setStep] = useState<CheckoutStep>('items');
  const [productLines, setProductLines] = useState<Record<string, CheckoutLineInput[]>>({});
  const [tipCents, setTipCents] = useState(0);
  const [tipSelection, setTipSelection] = useState<TipSelection>('none');
  const [customTipDollars, setCustomTipDollars] = useState('');
  const [productPickerFor, setProductPickerFor] = useState<string | null>(null);
  const [cashConfirmOpen, setCashConfirmOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptSaleIds, setReceiptSaleIds] = useState<string[]>([]);
  const [usedTerminalReader, setUsedTerminalReader] = useState(false);
  const [giftCardCodeInput, setGiftCardCodeInput] = useState('');
  const [appliedGiftCardCode, setAppliedGiftCardCode] = useState<string | undefined>();
  const customTipInputRef = useRef<HTMLInputElement>(null);
  const giftCardInputRef = useRef<HTMLInputElement>(null);
  const pendingSaleIdsRef = useRef<string[]>([]);
  const giftCardProgress = useBlockingProgress();

  useEffect(() => {
    if (open) {
      setStep('items');
      setProductLines({});
      setTipCents(0);
      setTipSelection('none');
      setCustomTipDollars('');
      setProductPickerFor(null);
      setCashConfirmOpen(false);
      setReceiptOpen(false);
      setReceiptSaleIds([]);
      setUsedTerminalReader(false);
      setGiftCardCodeInput('');
      setAppliedGiftCardCode(undefined);
      pendingSaleIdsRef.current = [];
    }
  }, [open, items]);

  const batchAppointments: BatchCheckoutAppointmentInput[] = useMemo(
    () =>
      items.map((item) => ({
        appointmentId: item.appointmentId,
        lines: [
          { lineType: 'service' as const, serviceId: item.serviceId, quantity: 1 },
          ...(productLines[item.appointmentId] ?? []),
        ],
      })),
    [items, productLines],
  );

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
    queryKey: ['batch-checkout-preview', orgId, batchAppointments, tipCents, appliedGiftCardCode],
    queryFn: () =>
      orgApi.previewBatchCheckout(orgId, {
        appointments: batchAppointments,
        tipCents,
        ...(appliedGiftCardCode ? { giftCardCode: appliedGiftCardCode } : {}),
      }),
    enabled: open && items.length > 0,
  });

  const subtotalCents = previewQuery.data?.subtotalCents ?? 0;
  const giftCardAppliedCents = previewQuery.data?.giftCardAppliedCents ?? 0;
  const dueCents = previewQuery.data?.totalCents ?? Math.max(0, subtotalCents + tipCents - giftCardAppliedCents);
  const totalCents = dueCents;
  const coveredByGiftCard = giftCardAppliedCents > 0 && dueCents < 1;

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
    mutationFn: () =>
      orgApi.batchCheckoutCash(orgId, {
        appointments: batchAppointments,
        tipCents: 0,
        ...(appliedGiftCardCode ? { giftCardCode: appliedGiftCardCode } : {}),
      }),
    onSuccess: (result) => {
      toast.success(coveredByGiftCard ? 'Sale completed with gift card' : 'Cash payment recorded');
      setCashConfirmOpen(false);
      setUsedTerminalReader(false);
      setReceiptSaleIds(result.saleIds ?? []);
      setReceiptOpen(true);
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Could not complete checkout')),
  });

  const applyGiftCardMutation = useMutation({
    mutationFn: async (code: string) => {
      const controller = new AbortController();
      giftCardProgress.start({
        title: 'Gift card',
        message: 'Looking up gift card…',
        onCancel: () => controller.abort(),
      });
      try {
        const { giftCard } = await orgApi.lookupGiftCard(orgId, { code }, controller.signal);
        giftCardProgress.update({
          message: 'Applying gift card…',
        });
        const preview = await orgApi.previewBatchCheckout(orgId, {
          appointments: batchAppointments,
          tipCents,
          giftCardCode: giftCard.code,
        });
        return { giftCard, preview };
      } finally {
        giftCardProgress.stop();
      }
    },
    onSuccess: ({ giftCard, preview }) => {
      if (!preview.giftCardAppliedCents) {
        toast.error('This gift card has no remaining credits');
        return;
      }
      setAppliedGiftCardCode(giftCard.code);
      setGiftCardCodeInput(giftCard.code);
      toast.success(`Applied ${formatCurrency(preview.giftCardAppliedCents)}`);
    },
    onError: (err: unknown) => {
      if (isRequestAborted(err)) return;
      toast.error(getApiErrorMessage(err, 'That gift card could not be used'));
    },
  });

  const products = productsData?.products ?? [];

  const setProductQuantity = useCallback(
    (appointmentId: string, productId: string, quantity: number) => {
      setProductLines((prev) => {
        const current = prev[appointmentId] ?? [];
        const without = current.filter((line) => line.productId !== productId);
        const next = quantity <= 0 ? without : [...without, { lineType: 'product' as const, productId, quantity }];
        return { ...prev, [appointmentId]: next };
      });
    },
    [],
  );

  const adjustProductQuantity = useCallback(
    (appointmentId: string, productId: string, delta: number) => {
      const current =
        (productLines[appointmentId] ?? []).find((line) => line.productId === productId)?.quantity ?? 0;
      const next = current + delta;
      if (next <= 0) {
        setProductQuantity(appointmentId, productId, 0);
        return;
      }
      const product = products.find((item) => item.id === productId);
      if (product?.trackInventory && next > product.stockQuantity) {
        toast.error(`Only ${product.stockQuantity} in stock`);
        return;
      }
      setProductQuantity(appointmentId, productId, next);
    },
    [productLines, products, setProductQuantity],
  );

  const completeCardPayment = useCallback(() => {
    toast.success('Card payment successful');
    setReceiptSaleIds(pendingSaleIdsRef.current);
    setReceiptOpen(true);
  }, []);

  const startTerminalCheckout = useCallback(async () => {
    const result = await orgApi.batchCheckoutCard(orgId, {
      appointments: batchAppointments,
      tipCents,
      mode: 'terminal',
      ...(appliedGiftCardCode ? { giftCardCode: appliedGiftCardCode } : {}),
    });
    pendingSaleIdsRef.current = result.saleIds ?? [];
    setUsedTerminalReader(true);
    return result;
  }, [orgId, batchAppointments, tipCents, appliedGiftCardCode]);

  const startOnlineCheckout = useCallback(async () => {
    const result = await orgApi.batchCheckoutCard(orgId, {
      appointments: batchAppointments,
      tipCents,
      mode: 'online',
      ...(appliedGiftCardCode ? { giftCardCode: appliedGiftCardCode } : {}),
    });
    pendingSaleIdsRef.current = result.saleIds ?? [];
    setUsedTerminalReader(false);
    return result;
  }, [orgId, batchAppointments, tipCents, appliedGiftCardCode]);

  const confirmPaymentIntent = useCallback(
    (paymentIntentId: string) => orgApi.confirmBatchCheckoutCard(orgId, paymentIntentId),
    [orgId],
  );

  const card = useCardCheckout({
    active: open && step === 'tip' && items.length > 0 && !!previewQuery.data,
    orgId,
    startTerminalCheckout,
    startOnlineCheckout,
    confirmPaymentIntent,
    publishableKey: connectStatus?.publishableKey,
    onSuccess: completeCardPayment,
  });

  const cardReady = isCardCheckoutReady(connectStatus);

  const previewByAppointmentId = useMemo(() => {
    const map: Record<string, NonNullable<typeof previewQuery.data>['appointments'][number]> = {};
    for (const entry of previewQuery.data?.appointments ?? []) {
      map[entry.appointmentId] = entry;
    }
    return map;
  }, [previewQuery.data]);

  const pickerQuantities = useMemo(() => {
    if (!productPickerFor) return {};
    const quantities: Record<string, number> = {};
    for (const line of productLines[productPickerFor] ?? []) {
      if (line.productId) quantities[line.productId] = line.quantity;
    }
    return quantities;
  }, [productPickerFor, productLines]);

  const nestedOverlayOpen =
    productPickerFor !== null ||
    cashConfirmOpen ||
    receiptOpen ||
    cashMutation.isPending ||
    applyGiftCardMutation.isPending ||
    giftCardProgress.dialogProps.open ||
    card.manualPreparing ||
    card.phase === 'starting' ||
    card.phase === 'confirming';

  const {
    handleSheetOpenChange: protectSheetOpenChange,
    preventSheetDismissWhileNested,
  } = useProtectSheetFromNestedOverlays(nestedOverlayOpen);

  const handleSheetOpenChange = useCallback(
    (next: boolean) => protectSheetOpenChange(next, onOpenChange),
    [protectSheetOpenChange, onOpenChange],
  );

  return (
    <>
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent
        className={cn(
          '!inset-0 !h-[100dvh] !w-full !max-w-none border-0 p-0',
          'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
          'sm:!max-w-none',
        )}
        onPointerDownOutside={preventSheetDismissWhileNested}
        onInteractOutside={preventSheetDismissWhileNested}
        onFocusOutside={preventSheetDismissWhileNested}
      >
        <div className="flex h-[100dvh] flex-col text-stone-900 dark:text-stone-100">
          <SheetHeader className="shrink-0 border-b border-stone-200 px-6 pb-4 pr-14 pt-[max(1rem,var(--safe-area-top))] dark:border-stone-800">
            <SheetTitle className="text-xl">Batch checkout</SheetTitle>
            <SheetDescription>
              {items.length} appointment{items.length === 1 ? '' : 's'} · one combined payment
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {previewQuery.isLoading && (
              <div className="flex items-center justify-center py-16 text-stone-500 dark:text-stone-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading checkout…
              </div>
            )}

            {!previewQuery.isLoading && step === 'items' && (
              <div className="space-y-6">
                {items.map((item) => {
                  const entry = previewByAppointmentId[item.appointmentId];
                  const appointmentProducts = productLines[item.appointmentId] ?? [];
                  const productCount = appointmentProducts.reduce((sum, line) => sum + line.quantity, 0);

                  return (
                    <section
                      key={item.appointmentId}
                      className="rounded-xl border border-stone-200 p-4 dark:border-stone-700"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className={cn('truncate', sectionHeadingClass)}>{item.customerName}</h4>
                          <p className={cn('truncate text-xs', sectionMutedClass)}>{item.serviceName}</p>
                        </div>
                        {entry && (
                          <span className="shrink-0 text-sm font-semibold tabular-nums">
                            {formatCurrency(entry.subtotalCents)}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {(entry?.lines ?? []).map((line) => (
                          <div
                            key={line.lineType === 'product' ? `product-${line.productId}` : `service-${line.serviceId ?? line.description}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
                          >
                            <span className="min-w-0 flex-1 truncate">{line.description}</span>
                            <div className="flex shrink-0 items-center gap-2">
                              {line.lineType === 'product' && line.productId ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => adjustProductQuantity(item.appointmentId, line.productId!, -1)}
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
                                    onClick={() => adjustProductQuantity(item.appointmentId, line.productId!, 1)}
                                    aria-label={`Add one ${line.description}`}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <span className={cn('text-sm', sectionMutedClass)}>× {line.quantity}</span>
                              )}
                              <span className="min-w-[3.5rem] text-right font-medium tabular-nums">
                                {formatCurrency(line.lineTotalCents)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setProductPickerFor(item.appointmentId)}
                        disabled={products.length === 0}
                      >
                        <PackagePlus className="h-4 w-4" />
                        {productCount > 0 ? `Edit products (${productCount})` : 'Add products'}
                      </Button>
                    </section>
                  );
                })}

                <section className="space-y-3">
                  <h4 className={cn(sectionHeadingClass)}>Gift card</h4>
                  {appliedGiftCardCode ? (
                    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-800">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono font-medium tracking-wide">{appliedGiftCardCode}</p>
                          <p className={cn('mt-0.5 text-xs', sectionMutedClass)}>
                            {previewQuery.data?.giftCardRemainingCents != null
                              ? `${formatCreditCount(previewQuery.data.giftCardRemainingCents)} left after this sale`
                              : 'Applied to this sale'}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums">
                          −{formatCurrency(giftCardAppliedCents)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-1 px-0 text-stone-500"
                        onClick={() => {
                          setAppliedGiftCardCode(undefined);
                          setGiftCardCodeInput('');
                          giftCardInputRef.current?.focus();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <form
                      className="flex flex-col gap-2 sm:flex-row"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const code = giftCardCodeInput.trim();
                        if (code.replace(/[^A-Za-z0-9]/g, '').length < 4) {
                          toast.error('Enter the gift card code');
                          return;
                        }
                        applyGiftCardMutation.mutate(code);
                      }}
                    >
                      <Input
                        ref={giftCardInputRef}
                        value={giftCardCodeInput}
                        onChange={(event) => setGiftCardCodeInput(event.target.value.toUpperCase())}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="Enter code"
                        className="font-mono tracking-wide sm:flex-1"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={applyGiftCardMutation.isPending || !giftCardCodeInput.trim()}
                      >
                        {applyGiftCardMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Gift className="h-4 w-4" />
                        )}
                        Apply
                      </Button>
                    </form>
                  )}
                </section>
              </div>
            )}

            {!previewQuery.isLoading && step === 'tip' && previewQuery.data && (
              <div className="mx-auto max-w-md space-y-6">
                <section className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm dark:border-stone-700 dark:bg-stone-900">
                  {previewQuery.data.appointments.map((entry) => {
                    const item = items.find((i) => i.appointmentId === entry.appointmentId);
                    return (
                      <div key={entry.appointmentId} className={cn('flex justify-between', sectionMutedClass)}>
                        <span className="truncate">{item?.customerName ?? 'Appointment'}</span>
                        <span className="tabular-nums text-stone-900 dark:text-stone-100">
                          {formatCurrency(entry.subtotalCents)}
                        </span>
                      </div>
                    );
                  })}
                  <div className={cn('mt-2 flex justify-between border-t border-stone-200 pt-2 dark:border-stone-700', sectionMutedClass)}>
                    <span>Subtotal</span>
                    <span className="tabular-nums text-stone-900 dark:text-stone-100">
                      {formatCurrency(previewQuery.data.subtotalCents)}
                    </span>
                  </div>
                  <div className={cn('mt-2 flex justify-between', sectionMutedClass)}>
                    <span>Tip</span>
                    <span className="tabular-nums text-stone-900 dark:text-stone-100">{formatCurrency(tipCents)}</span>
                  </div>
                  {giftCardAppliedCents > 0 && (
                    <div className={cn('mt-2 flex justify-between', sectionMutedClass)}>
                      <span>Gift card {appliedGiftCardCode}</span>
                      <span className="tabular-nums text-stone-900 dark:text-stone-100">
                        −{formatCurrency(giftCardAppliedCents)}
                      </span>
                    </div>
                  )}
                  <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-lg font-semibold dark:border-stone-700">
                    <span>{giftCardAppliedCents > 0 ? 'Due' : 'Total'}</span>
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

          <footer className="sticky bottom-0 z-10 shrink-0 border-t border-stone-200 bg-white px-6 pb-safe-or-3 pt-4 dark:border-stone-800 dark:bg-stone-900">
            {step === 'items' ? (
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                {previewQuery.data && (
                  <div className="text-sm tabular-nums text-stone-900 dark:text-stone-100">
                    <p className={cn(giftCardAppliedCents > 0 && sectionMutedClass)}>
                      Subtotal {formatCurrency(previewQuery.data.subtotalCents)}
                    </p>
                    {giftCardAppliedCents > 0 && (
                      <>
                        <p className={sectionMutedClass}>
                          Gift card −{formatCurrency(giftCardAppliedCents)}
                        </p>
                        <p className="font-medium">Due {formatCurrency(dueCents)}</p>
                      </>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant={coveredByGiftCard ? 'default' : 'outline'}
                    onClick={() => setCashConfirmOpen(true)}
                    disabled={!previewQuery.data || previewQuery.isLoading || cashMutation.isPending}
                  >
                    {coveredByGiftCard ? <Gift className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                    {coveredByGiftCard ? 'Complete with gift card' : 'Pay with cash'}
                  </Button>
                  {!coveredByGiftCard && (
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
                  )}
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('items')}
                className="w-full sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to order
              </Button>
            )}
          </footer>
        </div>
      </SheetContent>
    </Sheet>

    <CheckoutProductPickerDialog
      open={productPickerFor !== null}
      onOpenChange={(open) => !open && setProductPickerFor(null)}
      products={products}
      quantitiesByProductId={pickerQuantities}
      onSetProductQuantity={(productId, quantity) =>
        productPickerFor && setProductQuantity(productPickerFor, productId, quantity)
      }
    />

    <Dialog open={cashConfirmOpen} onOpenChange={setCashConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{coveredByGiftCard ? 'Complete with gift card' : 'Confirm cash payment'}</DialogTitle>
          <DialogDescription>
            {coveredByGiftCard ? (
              <>
                Apply gift card{' '}
                <span className="font-semibold text-stone-900 dark:text-stone-100">{appliedGiftCardCode}</span> to
                finish {items.length} appointment{items.length === 1 ? '' : 's'}?
              </>
            ) : (
              <>
                Mark {items.length} appointment{items.length === 1 ? '' : 's'} as paid
                {giftCardAppliedCents > 0 ? ' in cash after the gift card' : ' in cash'} for{' '}
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {formatCurrency(dueCents)}
                </span>
                ?
              </>
            )}
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
            ) : coveredByGiftCard ? (
              <Gift className="h-4 w-4" />
            ) : (
              <Banknote className="h-4 w-4" />
            )}
            {coveredByGiftCard ? 'Complete sale' : 'Confirm paid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <BlockingProgressDialog
      open={cashMutation.isPending}
      title="Checkout"
      message={coveredByGiftCard ? 'Completing sale with gift card…' : 'Recording cash payment…'}
    />
    <BlockingProgressDialog
      open={card.manualPreparing || card.phase === 'starting' || card.phase === 'confirming'}
      title="Card payment"
      message={
        card.manualPreparing
          ? 'Preparing secure card form…'
          : (card.status ??
            (card.phase === 'confirming' ? 'Recording card payment…' : 'Starting card payment…'))
      }
    />
    <BlockingProgressDialog {...giftCardProgress.dialogProps} />

    <ReceiptChoiceDialog
      orgId={orgId}
      open={receiptOpen}
      saleIds={receiptSaleIds}
      usedTerminalReader={usedTerminalReader}
      onFinished={() => {
        setReceiptOpen(false);
        onSuccess();
        onOpenChange(false);
      }}
    />
    </>
  );
}
