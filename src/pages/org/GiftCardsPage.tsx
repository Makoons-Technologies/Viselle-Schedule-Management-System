import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Gift } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel, sectionMutedClass } from '@/components/common/Panel';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import type { Customer, GiftCard, GiftCardStatus } from '@/types/api';

const NONE = 'none';

function centsFromDollars(dollars: string): number {
  return Math.round(Number(dollars) * 100);
}

function customerLabel(customer: Customer | undefined): string {
  if (!customer) return 'Not assigned';
  return `${customer.firstName} ${customer.lastName}`.trim();
}

function statusLabel(status: GiftCardStatus): string {
  if (status === 'redeemed') return 'Used up';
  if (status === 'void') return 'Voided';
  return 'Ready';
}

function statusVariant(status: GiftCardStatus): 'success' | 'secondary' | 'destructive' {
  if (status === 'active') return 'success';
  if (status === 'void') return 'destructive';
  return 'secondary';
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    toast.success('Code copied');
  } catch {
    toast.error('Could not copy the code');
  }
}

export function GiftCardsPage() {
  const orgId = useOrgId();
  const trialLocked = useOrgWriteLocked();
  const queryClient = useQueryClient();

  const [sellOpen, setSellOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<GiftCard | null>(null);
  const [createdCard, setCreatedCard] = useState<GiftCard | null>(null);

  const [sellAmount, setSellAmount] = useState('');
  const [sellCustomerId, setSellCustomerId] = useState(NONE);
  const [sellNotes, setSellNotes] = useState('');

  const [redeemCode, setRedeemCode] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');

  const cardsQuery = useQuery({
    queryKey: ['gift-cards', orgId],
    queryFn: () => orgApi.listGiftCards(orgId),
    enabled: !!orgId,
  });
  const customersQuery = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId,
  });

  const customersById = useMemo(
    () => Object.fromEntries((customersQuery.data?.customers ?? []).map((customer) => [customer.id, customer])),
    [customersQuery.data?.customers],
  );

  const giftCards = cardsQuery.data?.giftCards ?? [];
  const customers = customersQuery.data?.customers ?? [];

  const createMutation = useMutation({
    mutationFn: () => {
      const amountCents = centsFromDollars(sellAmount);
      if (!Number.isFinite(amountCents) || amountCents < 100) {
        throw new Error('Enter at least $1.00');
      }
      return orgApi.createGiftCard(orgId, {
        amountCents,
        customerId: sellCustomerId === NONE ? undefined : sellCustomerId,
        notes: sellNotes.trim() || undefined,
      });
    },
    onSuccess: ({ giftCard }) => {
      setCreatedCard(giftCard);
      setSellAmount('');
      setSellCustomerId(NONE);
      setSellNotes('');
      setSellOpen(false);
      toast.success('Gift card ready to hand over');
      void queryClient.invalidateQueries({ queryKey: ['gift-cards', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not sell this gift card')),
  });

  const redeemMutation = useMutation({
    mutationFn: () => {
      const amountCents = centsFromDollars(redeemAmount);
      if (!Number.isFinite(amountCents) || amountCents < 1) {
        throw new Error('Enter an amount to take off the card');
      }
      const code = redeemCode.trim();
      if (code.length < 4) throw new Error('Enter the gift card code');
      return orgApi.redeemGiftCard(orgId, { code, amountCents });
    },
    onSuccess: ({ giftCard }) => {
      const takenCents = centsFromDollars(redeemAmount);
      setRedeemCode('');
      setRedeemAmount('');
      setRedeemOpen(false);
      setCreatedCard(null);
      toast.success(
        giftCard.remainingCents > 0
          ? `Took ${formatCurrency(takenCents)}. ${formatCurrency(giftCard.remainingCents)} left.`
          : 'Card is used up',
      );
      void queryClient.invalidateQueries({ queryKey: ['gift-cards', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not redeem this gift card')),
  });

  const voidMutation = useMutation({
    mutationFn: (giftCardId: string) => orgApi.voidGiftCard(orgId, giftCardId),
    onSuccess: () => {
      toast.success('Gift card voided');
      setVoidTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['gift-cards', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not void this gift card')),
  });

  if (cardsQuery.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gift cards"
        description="Sell a card at the desk, redeem it later. No second processor."
        actions={
          <>
            <TrialLockedControl locked={trialLocked}>
              <Button variant="outline" disabled={trialLocked} onClick={() => setRedeemOpen(true)}>
                Redeem
              </Button>
            </TrialLockedControl>
            <TrialLockedControl locked={trialLocked}>
              <Button disabled={trialLocked} onClick={() => setSellOpen(true)}>
                Sell a card
              </Button>
            </TrialLockedControl>
          </>
        }
      />

      {createdCard && (
        <Panel className="border-brand-200 bg-brand-50 p-4 sm:p-5 dark:border-brand-900 dark:bg-brand-950/40">
          <p className={cn('text-sm', sectionMutedClass)}>Give this code to the guest. They will need it to redeem.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-2xl font-semibold tracking-[0.2em] text-stone-900 sm:text-3xl dark:text-stone-50">
              {createdCard.code}
            </p>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => void copyCode(createdCard.code)}>
              <Copy className="h-4 w-4" />
              Copy code
            </Button>
          </div>
          <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
            {formatCurrency(createdCard.remainingCents)} on the card
            {createdCard.customerId ? ` · ${customerLabel(customersById[createdCard.customerId])}` : ''}
          </p>
        </Panel>
      )}

      {giftCards.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No gift cards yet"
          description="Sell one at the desk and hand over the code. Guests can redeem it on a later visit."
          action={
            <TrialLockedControl locked={trialLocked}>
              <Button disabled={trialLocked} onClick={() => setSellOpen(true)}>
                Sell a card
              </Button>
            </TrialLockedControl>
          }
        />
      ) : (
        <Panel className="overflow-hidden">
          <div className="desktop-shell:hidden">
            {giftCards.map((card) => (
              <GiftCardCard
                key={card.id}
                card={card}
                customerName={customerLabel(customersById[card.customerId ?? ''])}
                trialLocked={trialLocked}
                onVoid={() => setVoidTarget(card)}
              />
            ))}
          </div>
          <div className="hidden desktop-shell:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {giftCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-mono font-medium tracking-wide">{card.code}</TableCell>
                    <TableCell>
                      {formatCurrency(card.remainingCents)} / {formatCurrency(card.originalCents)}
                    </TableCell>
                    <TableCell className="text-stone-500">{customerLabel(customersById[card.customerId ?? ''])}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(card.status)}>{statusLabel(card.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {card.status === 'active' && (
                        <TrialLockedControl locked={trialLocked}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={trialLocked}
                            onClick={() => setVoidTarget(card)}
                          >
                            Void
                          </Button>
                        </TrialLockedControl>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      )}

      <Dialog open={sellOpen} onOpenChange={setSellOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell a gift card</DialogTitle>
            <DialogDescription>Collect payment at the desk, then hand over the code we generate.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="gift-amount">Amount ($)</Label>
              <Input
                id="gift-amount"
                type="number"
                min={1}
                step={0.01}
                inputMode="decimal"
                placeholder="100"
                value={sellAmount}
                onChange={(event) => setSellAmount(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Customer (optional)</Label>
              <Select value={sellCustomerId} onValueChange={setSellCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Not assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not assigned</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gift-notes">Notes (optional)</Label>
              <Input
                id="gift-notes"
                value={sellNotes}
                onChange={(event) => setSellNotes(event.target.value)}
                placeholder="Birthday, from mom…"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSellOpen(false)}>
                Cancel
              </Button>
              <TrialLockedControl locked={trialLocked}>
                <Button type="submit" disabled={trialLocked || createMutation.isPending}>
                  {createMutation.isPending ? 'Selling…' : 'Sell card'}
                </Button>
              </TrialLockedControl>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem a gift card</DialogTitle>
            <DialogDescription>Take the amount they are using today off the remaining balance.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              redeemMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="redeem-code">Code</Label>
              <Input
                id="redeem-code"
                value={redeemCode}
                onChange={(event) => setRedeemCode(event.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="ABCD2345"
                className="font-mono tracking-wide"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="redeem-amount">Amount ($)</Label>
              <Input
                id="redeem-amount"
                type="number"
                min={0.01}
                step={0.01}
                inputMode="decimal"
                value={redeemAmount}
                onChange={(event) => setRedeemAmount(event.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRedeemOpen(false)}>
                Cancel
              </Button>
              <TrialLockedControl locked={trialLocked}>
                <Button type="submit" disabled={trialLocked || redeemMutation.isPending}>
                  {redeemMutation.isPending ? 'Redeeming…' : 'Redeem'}
                </Button>
              </TrialLockedControl>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!voidTarget} onOpenChange={(open) => !open && setVoidTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this gift card?</DialogTitle>
            <DialogDescription>
              {voidTarget
                ? `${voidTarget.code} will no longer work. Remaining ${formatCurrency(voidTarget.remainingCents)} will be lost.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVoidTarget(null)}>
              Keep it
            </Button>
            <TrialLockedControl locked={trialLocked}>
              <Button
                variant="destructive"
                disabled={trialLocked || voidMutation.isPending || !voidTarget}
                onClick={() => voidTarget && voidMutation.mutate(voidTarget.id)}
              >
                {voidMutation.isPending ? 'Voiding…' : 'Void card'}
              </Button>
            </TrialLockedControl>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GiftCardCard({
  card,
  customerName,
  trialLocked,
  onVoid,
}: {
  card: GiftCard;
  customerName: string;
  trialLocked: boolean;
  onVoid: () => void;
}) {
  return (
    <div className="space-y-3 border-b border-stone-100 p-4 last:border-b-0 dark:border-stone-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-lg font-semibold tracking-wide">{card.code}</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            {formatCurrency(card.remainingCents)} left of {formatCurrency(card.originalCents)}
          </p>
          <p className="mt-1 text-sm text-stone-500">{customerName}</p>
          {card.notes && <p className="mt-1 text-xs text-stone-500">{card.notes}</p>}
        </div>
        <Badge variant={statusVariant(card.status)} className="shrink-0">
          {statusLabel(card.status)}
        </Badge>
      </div>
      {card.status === 'active' && (
        <TrialLockedControl locked={trialLocked}>
          <Button variant="outline" size="sm" className="w-full" disabled={trialLocked} onClick={onVoid}>
            Void
          </Button>
        </TrialLockedControl>
      )}
    </div>
  );
}
