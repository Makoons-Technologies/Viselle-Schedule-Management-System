import { useMutation } from '@tanstack/react-query';
import { Loader2, Mail, MessageSquare, Printer, ReceiptText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getApiErrorMessage, isRequestAborted, orgApi } from '@/lib/api';
import { BlockingProgressDialog, useBlockingProgress } from '@/components/common/BlockingProgressDialog';
import { printReceiptCopies } from '@/lib/print-receipt';
import { getLastReceiptChannel, rememberReceiptChannel } from '@/lib/receipt-preference';
import { cn } from '@/lib/utils';
import type { ReceiptChannel, ReceiptSnapshot } from '@/types/api';
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

const CHOICES: { id: ReceiptChannel; label: string; hint: string; icon: typeof Printer }[] = [
  { id: 'print', label: 'Print', hint: 'Customer copy', icon: Printer },
  { id: 'sms', label: 'Text', hint: 'Send by SMS', icon: MessageSquare },
  { id: 'email', label: 'Email', hint: 'Send a receipt', icon: Mail },
  { id: 'none', label: 'No receipt', hint: 'Skip the guest copy', icon: ReceiptText },
];

interface ReceiptChoiceDialogProps {
  orgId: string;
  open: boolean;
  saleIds: string[];
  customerEmail?: string | null;
  customerPhone?: string | null;
  usedTerminalReader?: boolean;
  onFinished: () => void;
}

export function ReceiptChoiceDialog({
  orgId,
  open,
  saleIds,
  customerEmail,
  customerPhone,
  usedTerminalReader = false,
  onFinished,
}: ReceiptChoiceDialogProps) {
  const last = getLastReceiptChannel();
  const [channel, setChannel] = useState<ReceiptChannel | null>(last);
  const [destination, setDestination] = useState('');
  const finishedRef = useRef(false);
  const progress = useBlockingProgress();

  useEffect(() => {
    if (!open) return;
    const remembered = getLastReceiptChannel();
    setChannel(remembered);
    if (remembered === 'email') setDestination(customerEmail?.trim() ?? '');
    else if (remembered === 'sms') setDestination(customerPhone?.trim() ?? '');
    else setDestination('');
  }, [open, customerEmail, customerPhone]);

  const deliver = useMutation({
    mutationFn: async () => {
      if (!channel) throw new Error('Choose how to send the receipt');
      const needsDest = channel === 'email' || channel === 'sms';
      const controller = new AbortController();
      const sendingMessage =
        channel === 'print'
          ? 'Preparing receipt…'
          : channel === 'email'
            ? 'Sending receipt…'
            : channel === 'sms'
              ? 'Texting the receipt…'
              : 'Saving receipt preference…';
      progress.start({
        title: 'Receipt',
        message: sendingMessage,
        progress: channel === 'print' ? { current: 1, total: 2 } : null,
        onCancel: () => controller.abort(),
      });
      try {
        const result = await orgApi.deliverReceipt(
          orgId,
          {
            saleIds,
            customerChannel: channel,
            ...(needsDest && destination.trim() ? { destination: destination.trim() } : {}),
            printerConfigured: usedTerminalReader,
          },
          controller.signal,
        );
        if (channel === 'print') {
          progress.update({
            message: 'Opening print dialog…',
            progress: { current: 2, total: 2 },
            onCancel: undefined,
          });
        } else {
          progress.update({ onCancel: undefined });
        }
        return result;
      } catch (err) {
        progress.stop();
        throw err;
      }
    },
    onSuccess: (result) => {
      if (!channel) return;
      rememberReceiptChannel(channel);
      finishedRef.current = true;
      if (channel === 'print') {
        const printed = printReceiptCopies(result.receipt);
        if (!printed) toast.error('Allow pop-ups to print the receipt');
      } else if (channel === 'email') {
        toast.success('Receipt emailed');
      } else if (channel === 'sms') {
        toast.success(result.smsPaused ? (result.smsPausedMessage ?? 'Text is paused') : 'Receipt texted');
      }
      progress.stop();
      onFinished();
    },
    onError: (err: unknown) => {
      if (isRequestAborted(err)) return;
      toast.error(getApiErrorMessage(err, 'Could not send the receipt'));
    },
  });

  const needsDestination = channel === 'email' || channel === 'sms';

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next || deliver.isPending || finishedRef.current) return;
        finishedRef.current = true;
        if (saleIds.length > 0) {
          void orgApi
            .deliverReceipt(orgId, {
              saleIds,
              customerChannel: 'none',
              printerConfigured: usedTerminalReader,
            })
            .catch(() => undefined)
            .finally(onFinished);
          return;
        }
        onFinished();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How should we send the receipt?</DialogTitle>
          <DialogDescription>
            The merchant copy still prints on a receipt printer when one is set up. Choosing no
            receipt does not skip that copy.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {CHOICES.map((choice) => {
            const Icon = choice.icon;
            const selected = channel === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => {
                  setChannel(choice.id);
                  if (choice.id === 'email') setDestination(customerEmail?.trim() ?? '');
                  if (choice.id === 'sms') setDestination(customerPhone?.trim() ?? '');
                }}
                className={cn(
                  'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                  selected
                    ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/40'
                    : 'border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800',
                )}
              >
                <Icon className="mb-2 h-4 w-4" />
                <p className="font-semibold">{choice.label}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{choice.hint}</p>
              </button>
            );
          })}
        </div>

        {needsDestination && (
          <div>
            <p className="mb-1 text-sm font-medium">{channel === 'email' ? 'Email' : 'Mobile number'}</p>
            <Input
              type={channel === 'email' ? 'email' : 'tel'}
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder={channel === 'email' ? 'guest@email.com' : '555-123-4567'}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            disabled={!channel || deliver.isPending || saleIds.length === 0}
            onClick={() => deliver.mutate()}
          >
            {deliver.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <BlockingProgressDialog {...progress.dialogProps} />
    </>
  );
}

export function receiptFromPreview(params: {
  organizationName: string;
  customerName: string;
  lines: Array<{ description: string; quantity: number; unitPriceCents: number; lineTotalCents: number }>;
  subtotalCents: number;
  tipCents: number;
  totalCents: number;
}): ReceiptSnapshot {
  return {
    organizationName: params.organizationName,
    customerName: params.customerName,
    lineItems: params.lines,
    subtotalCents: params.subtotalCents,
    tipCents: params.tipCents,
    totalCents: params.totalCents,
    paidAt: new Date().toISOString(),
    paymentMethod: 'sale',
  };
}
