import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Gift, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { ListToolbar, matchesSearch } from '@/components/common/ListToolbar';
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
import { Textarea } from '@/components/ui/textarea';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { CENTS_PER_CREDIT, creditValueHint, formatCreditBalance, formatCredits } from '@/lib/credits';
import { cn, formatCurrency } from '@/lib/utils';
import type { GiftCard, GiftCardStatus } from '@/types/api';

function centsFromDollars(dollars: string): number {
  return Math.round(Number(dollars) * 100);
}

function statusLabel(status: GiftCardStatus): string {
  if (status === 'inactive') return 'Needs funds';
  if (status === 'redeemed') return 'Used up';
  if (status === 'void') return 'Voided';
  return 'Ready';
}

function statusVariant(status: GiftCardStatus): 'success' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'active') return 'success';
  if (status === 'void') return 'destructive';
  if (status === 'inactive') return 'outline';
  return 'secondary';
}

function parseCodeList(raw: string): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const code = part.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    toast.success('Code copied');
  } catch {
    toast.error('Could not copy the code');
  }
}

type StatusFilter = 'all' | GiftCardStatus;

export function GiftCardsPage() {
  const orgId = useOrgId();
  const trialLocked = useOrgWriteLocked();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [activateOpen, setActivateOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [listActivateOpen, setListActivateOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<GiftCard | null>(null);
  const [fundTarget, setFundTarget] = useState<GiftCard | null>(null);
  const [createdCard, setCreatedCard] = useState<GiftCard | null>(null);

  const [sellAmount, setSellAmount] = useState('');
  const [sellCredits, setSellCredits] = useState('');
  const [codeMode, setCodeMode] = useState<'auto' | 'printed'>('auto');
  const [printedCode, setPrintedCode] = useState('');
  const [bulkCodes, setBulkCodes] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [fundCredits, setFundCredits] = useState('');

  const cardsQuery = useQuery({
    queryKey: ['gift-cards', orgId],
    queryFn: () => orgApi.listGiftCards(orgId),
    enabled: !!orgId,
  });

  const giftCards = cardsQuery.data?.giftCards ?? [];

  const filtered = useMemo(
    () =>
      giftCards.filter((card) => {
        if (statusFilter !== 'all' && card.status !== statusFilter) return false;
        return matchesSearch(search, card.code);
      }),
    [giftCards, search, statusFilter],
  );

  const createMutation = useMutation({
    mutationFn: () => {
      const amountCents = centsFromDollars(sellAmount);
      if (!Number.isFinite(amountCents) || amountCents < 100) {
        throw new Error('Enter at least $1.00');
      }
      const creditCents = sellCredits.trim() ? centsFromDollars(sellCredits) : amountCents;
      if (!Number.isFinite(creditCents) || creditCents < CENTS_PER_CREDIT) {
        throw new Error('Credits must be at least 1');
      }
      const code = codeMode === 'printed' ? printedCode.trim() : undefined;
      if (codeMode === 'printed' && code && code.replace(/[^A-Za-z0-9]/g, '').length < 4) {
        throw new Error('Enter the printed code, at least 4 letters or numbers');
      }
      return orgApi.createGiftCard(orgId, {
        amountCents,
        creditCents,
        code,
      });
    },
    onSuccess: ({ giftCard }) => {
      setCreatedCard(giftCard);
      setSellAmount('');
      setSellCredits('');
      setPrintedCode('');
      setCodeMode('auto');
      setActivateOpen(false);
      toast.success('Card is ready to hand over');
      void queryClient.invalidateQueries({ queryKey: ['gift-cards', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not activate this card')),
  });

  const activateListMutation = useMutation({
    mutationFn: () => {
      const codes = parseCodeList(bulkCodes);
      if (codes.length === 0) {
        throw new Error('Enter at least one code (4+ letters or numbers)');
      }
      if (codes.length > 100) {
        throw new Error('Activate up to 100 codes at a time');
      }
      return orgApi.activateGiftCards(orgId, { codes });
    },
    onSuccess: ({ giftCards: created, errors }) => {
      setBulkCodes('');
      setListActivateOpen(false);
      if (created.length > 0) {
        toast.success(
          created.length === 1
            ? '1 card activated — add funds when you sell it'
            : `${created.length} cards activated — add funds when you sell them`,
        );
      }
      if (errors.length > 0) {
        toast.error(
          errors.length === 1
            ? `${errors[0].code}: ${errors[0].message}`
            : `${errors.length} codes could not be activated`,
        );
      }
      void queryClient.invalidateQueries({ queryKey: ['gift-cards', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not activate those cards')),
  });

  const addFundsMutation = useMutation({
    mutationFn: () => {
      if (!fundTarget) throw new Error('Pick a card first');
      const amountCents = centsFromDollars(fundAmount);
      if (!Number.isFinite(amountCents) || amountCents < 100) {
        throw new Error('Enter at least $1.00');
      }
      const creditCents = fundCredits.trim() ? centsFromDollars(fundCredits) : amountCents;
      if (!Number.isFinite(creditCents) || creditCents < CENTS_PER_CREDIT) {
        throw new Error('Credits must be at least 1');
      }
      return orgApi.addFundsToGiftCard(orgId, fundTarget.id, { amountCents, creditCents });
    },
    onSuccess: ({ giftCard }) => {
      setCreatedCard(giftCard);
      setFundTarget(null);
      setFundOpen(false);
      setFundAmount('');
      setFundCredits('');
      toast.success('Funds added — card is ready to use');
      void queryClient.invalidateQueries({ queryKey: ['gift-cards', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not add funds')),
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

  const openAddFunds = (card: GiftCard) => {
    setFundTarget(card);
    setFundAmount('');
    setFundCredits('');
    setFundOpen(true);
  };

  if (cardsQuery.isLoading) return <LoadingState />;

  const bulkPreviewCount = parseCodeList(bulkCodes).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gift cards"
        description="Activate printed codes, add funds when you sell them, and redeem at checkout."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <TrialLockedControl locked={trialLocked}>
              <Button variant="outline" disabled={trialLocked} onClick={() => setListActivateOpen(true)}>
                Activate a list
              </Button>
            </TrialLockedControl>
            <TrialLockedControl locked={trialLocked}>
              <Button disabled={trialLocked} onClick={() => setActivateOpen(true)}>
                <Plus className="h-4 w-4" />
                Activate & fund
              </Button>
            </TrialLockedControl>
          </div>
        }
      />

      {createdCard && (
        <Panel className="border-brand-200 bg-brand-50 p-4 sm:p-5 dark:border-brand-900 dark:bg-brand-950/40">
          <p className={cn('text-sm', sectionMutedClass)}>Give this code to the guest. They will need it at checkout.</p>
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
            {formatCreditBalance(createdCard.remainingCents, createdCard.originalCents)}
            {createdCard.priceCents != null && createdCard.priceCents !== createdCard.originalCents
              ? ` · paid ${formatCurrency(createdCard.priceCents)}`
              : ''}
          </p>
        </Panel>
      )}

      {giftCards.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No gift cards yet"
          description="Activate a printed list of codes, then add funds when you sell each card."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <TrialLockedControl locked={trialLocked}>
                <Button variant="outline" disabled={trialLocked} onClick={() => setListActivateOpen(true)}>
                  Activate a list
                </Button>
              </TrialLockedControl>
              <TrialLockedControl locked={trialLocked}>
                <Button disabled={trialLocked} onClick={() => setActivateOpen(true)}>
                  Activate & fund
                </Button>
              </TrialLockedControl>
            </div>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by code…"
            filters={
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cards</SelectItem>
                  <SelectItem value="inactive">Needs funds</SelectItem>
                  <SelectItem value="active">Ready</SelectItem>
                  <SelectItem value="redeemed">Used up</SelectItem>
                  <SelectItem value="void">Voided</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          {filtered.length === 0 ? (
            <EmptyState icon={Gift} title="No gift cards match" description="Try a different code or status filter." />
          ) : (
            <Panel className="overflow-hidden">
              <div className="desktop-shell:hidden">
                {filtered.map((card) => (
                  <GiftCardCard
                    key={card.id}
                    card={card}
                    trialLocked={trialLocked}
                    onAddFunds={() => openAddFunds(card)}
                    onVoid={() => setVoidTarget(card)}
                  />
                ))}
              </div>
              <div className="hidden desktop-shell:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell className="font-mono font-medium tracking-wide">{card.code}</TableCell>
                        <TableCell>{formatCreditBalance(card.remainingCents, card.originalCents)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(card.status)}>{statusLabel(card.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {(card.status === 'inactive' || card.status === 'active') && (
                              <TrialLockedControl locked={trialLocked}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={trialLocked}
                                  onClick={() => openAddFunds(card)}
                                >
                                  Add funds
                                </Button>
                              </TrialLockedControl>
                            )}
                            {(card.status === 'inactive' || card.status === 'active') && (
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Panel>
          )}
        </>
      )}

      <Dialog
        open={activateOpen}
        onOpenChange={(open) => {
          setActivateOpen(open);
          if (!open) {
            setSellCredits('');
            setPrintedCode('');
            setCodeMode('auto');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate & fund a card</DialogTitle>
            <DialogDescription>
              Collect payment at the desk and hand over a funded code. Or activate a blank list first, then add funds
              when each card sells.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="gift-amount">Price ($)</Label>
                <Input
                  id="gift-amount"
                  type="number"
                  min={1}
                  step={0.01}
                  inputMode="decimal"
                  placeholder="50"
                  value={sellAmount}
                  onChange={(event) => setSellAmount(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gift-credits">Credits on the card</Label>
                <Input
                  id="gift-credits"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder={sellAmount || '50'}
                  value={sellCredits}
                  onChange={(event) => setSellCredits(event.target.value)}
                />
              </div>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {creditValueHint(
                centsFromDollars(sellCredits.trim() || sellAmount || '0'),
                centsFromDollars(sellAmount || '0'),
              )}
            </p>
            <div className="space-y-2">
              <Label>Code</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={codeMode === 'auto' ? 'default' : 'outline'}
                  onClick={() => setCodeMode('auto')}
                >
                  Auto generate
                </Button>
                <Button
                  type="button"
                  variant={codeMode === 'printed' ? 'default' : 'outline'}
                  onClick={() => setCodeMode('printed')}
                >
                  Use printed code
                </Button>
              </div>
              {codeMode === 'printed' ? (
                <Input
                  value={printedCode}
                  onChange={(event) => setPrintedCode(event.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="HBWZNHLC"
                  className="font-mono tracking-wide"
                  required
                />
              ) : (
                <p className={cn('text-sm', sectionMutedClass)}>
                  Viselle will create an 8-character code when you activate the card.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActivateOpen(false)}>
                Cancel
              </Button>
              <TrialLockedControl locked={trialLocked}>
                <Button type="submit" disabled={trialLocked || createMutation.isPending}>
                  {createMutation.isPending ? 'Activating…' : 'Activate card'}
                </Button>
              </TrialLockedControl>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={listActivateOpen}
        onOpenChange={(open) => {
          setListActivateOpen(open);
          if (!open) setBulkCodes('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate a list of cards</DialogTitle>
            <DialogDescription>
              Paste printed codes (one per line). Cards start with no balance — add funds when you sell each one.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              activateListMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="bulk-codes">Codes</Label>
              <Textarea
                id="bulk-codes"
                value={bulkCodes}
                onChange={(event) => setBulkCodes(event.target.value.toUpperCase())}
                placeholder={'HBWZNHLC\nKQ9MPL2R\n…'}
                className="min-h-40 font-mono tracking-wide"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                required
              />
              <p className={cn('text-sm', sectionMutedClass)}>
                {bulkPreviewCount === 0
                  ? 'Enter codes with at least 4 letters or numbers.'
                  : `${bulkPreviewCount} unique code${bulkPreviewCount === 1 ? '' : 's'} ready`}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setListActivateOpen(false)}>
                Cancel
              </Button>
              <TrialLockedControl locked={trialLocked}>
                <Button type="submit" disabled={trialLocked || activateListMutation.isPending || bulkPreviewCount === 0}>
                  {activateListMutation.isPending ? 'Activating…' : `Activate ${bulkPreviewCount || ''}`.trim()}
                </Button>
              </TrialLockedControl>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fundOpen}
        onOpenChange={(open) => {
          setFundOpen(open);
          if (!open) {
            setFundTarget(null);
            setFundAmount('');
            setFundCredits('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add funds</DialogTitle>
            <DialogDescription>
              {fundTarget
                ? `Load credits onto ${fundTarget.code}. Guests can spend them at checkout.`
                : 'Load credits onto a gift card.'}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              addFundsMutation.mutate();
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fund-amount">Price ($)</Label>
                <Input
                  id="fund-amount"
                  type="number"
                  min={1}
                  step={0.01}
                  inputMode="decimal"
                  placeholder="50"
                  value={fundAmount}
                  onChange={(event) => setFundAmount(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fund-credits">Credits to add</Label>
                <Input
                  id="fund-credits"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder={fundAmount || '50'}
                  value={fundCredits}
                  onChange={(event) => setFundCredits(event.target.value)}
                />
              </div>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {creditValueHint(
                centsFromDollars(fundCredits.trim() || fundAmount || '0'),
                centsFromDollars(fundAmount || '0'),
              )}
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFundOpen(false)}>
                Cancel
              </Button>
              <TrialLockedControl locked={trialLocked}>
                <Button type="submit" disabled={trialLocked || addFundsMutation.isPending || !fundTarget}>
                  {addFundsMutation.isPending ? 'Adding…' : 'Add funds'}
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
                ? `${voidTarget.code} will no longer work. Remaining ${formatCredits(voidTarget.remainingCents)} will be lost.`
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
  trialLocked,
  onAddFunds,
  onVoid,
}: {
  card: GiftCard;
  trialLocked: boolean;
  onAddFunds: () => void;
  onVoid: () => void;
}) {
  return (
    <div className="space-y-3 border-b border-stone-100 p-4 last:border-b-0 dark:border-stone-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-lg font-semibold tracking-wide">{card.code}</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            {formatCreditBalance(card.remainingCents, card.originalCents)}
          </p>
          {card.notes && <p className="mt-1 text-xs text-stone-500">{card.notes}</p>}
        </div>
        <Badge variant={statusVariant(card.status)} className="shrink-0">
          {statusLabel(card.status)}
        </Badge>
      </div>
      {(card.status === 'inactive' || card.status === 'active') && (
        <div className="flex gap-2">
          <TrialLockedControl locked={trialLocked}>
            <Button variant="outline" size="sm" className="flex-1" disabled={trialLocked} onClick={onAddFunds}>
              Add funds
            </Button>
          </TrialLockedControl>
          <TrialLockedControl locked={trialLocked}>
            <Button variant="outline" size="sm" className="flex-1" disabled={trialLocked} onClick={onVoid}>
              Void
            </Button>
          </TrialLockedControl>
        </div>
      )}
    </div>
  );
}
