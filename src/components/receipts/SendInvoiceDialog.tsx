import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import type { InvoiceStatus } from '@/types/api';
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

interface SendInvoiceDialogProps {
  orgId: string;
  appointmentId: string;
  open: boolean;
  status: InvoiceStatus;
  customerEmail?: string | null;
  customerPhone?: string | null;
  onOpenChange: (open: boolean) => void;
}

export function SendInvoiceDialog({
  orgId,
  appointmentId,
  open,
  status,
  customerEmail,
  customerPhone,
  onOpenChange,
}: SendInvoiceDialogProps) {
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [destination, setDestination] = useState('');

  useEffect(() => {
    if (!open) return;
    setChannel(customerEmail?.trim() ? 'email' : customerPhone?.trim() ? 'sms' : 'email');
    setDestination((customerEmail?.trim() ? customerEmail : customerPhone) ?? '');
  }, [open, customerEmail, customerPhone]);

  const send = useMutation({
    mutationFn: () =>
      orgApi.sendInvoice(orgId, {
        appointmentId,
        status,
        channel,
        destination: destination.trim(),
      }),
    onSuccess: (result) => {
      if (result.smsPaused) {
        toast.error(result.smsPausedMessage ?? 'Text messages are paused');
        return;
      }
      toast.success(status === 'paid' ? 'Receipt sent' : 'Invoice sent');
      onOpenChange(false);
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Could not send')),
  });

  const title = status === 'paid' ? 'Send receipt' : 'Send invoice';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {status === 'paid'
              ? 'Email or text a receipt-style invoice for this paid visit.'
              : 'Send an unpaid invoice with a pay link so they can settle the balance later.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button type="button" variant={channel === 'email' ? 'default' : 'outline'} onClick={() => {
            setChannel('email');
            setDestination(customerEmail?.trim() ?? '');
          }}>
            Email
          </Button>
          <Button type="button" variant={channel === 'sms' ? 'default' : 'outline'} onClick={() => {
            setChannel('sms');
            setDestination(customerPhone?.trim() ?? '');
          }}>
            Text
          </Button>
        </div>
        <Input
          type={channel === 'email' ? 'email' : 'tel'}
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          placeholder={channel === 'email' ? 'guest@email.com' : '555-123-4567'}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={send.isPending}>
            Cancel
          </Button>
          <Button type="button" disabled={!destination.trim() || send.isPending} onClick={() => send.mutate()}>
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
