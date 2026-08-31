import { formatCurrency } from '@/lib/utils';

/** 1 credit = $1 of redeemable value. Stored as cents so packs and gift cards share a ledger. */
export const CENTS_PER_CREDIT = 100;

export function creditsFromCents(cents: number): number {
  return cents / CENTS_PER_CREDIT;
}

export function formatCreditCount(cents: number): string {
  const credits = creditsFromCents(cents);
  return Number.isInteger(credits) ? String(credits) : credits.toFixed(2).replace(/\.?0+$/, '');
}

export function formatCredits(cents: number): string {
  const amount = formatCreditCount(cents);
  const credits = creditsFromCents(cents);
  return `${amount} credit${credits === 1 ? '' : 's'}`;
}

export function formatCreditBalance(remainingCents: number, originalCents: number): string {
  return `${formatCreditCount(remainingCents)}/${formatCreditCount(originalCents)}`;
}

export function creditValueHint(creditCents: number, priceCents: number): string {
  if (!Number.isFinite(creditCents) || creditCents < 100 || !Number.isFinite(priceCents) || priceCents < 0) {
    return '1 credit = $1 toward a visit. Example: 100 credits for $50.';
  }
  if (creditCents > priceCents) {
    return `1 credit = $1. Guests pay ${formatCurrency(priceCents)} and get ${formatCredits(creditCents)} (${formatCurrency(creditCents)} of value).`;
  }
  return `1 credit = $1. Guests pay ${formatCurrency(priceCents)} and get ${formatCredits(creditCents)}.`;
}

export function packageCreditCents(pack: { creditCents?: number; visitCount?: number }): number {
  if (typeof pack.creditCents === 'number') return pack.creditCents;
  if (typeof pack.visitCount === 'number') return pack.visitCount * CENTS_PER_CREDIT;
  return 0;
}

export function remainingPackageCreditCents(sold: {
  remainingCreditCents?: number;
  remainingVisits?: number;
}): number {
  if (typeof sold.remainingCreditCents === 'number') return sold.remainingCreditCents;
  if (typeof sold.remainingVisits === 'number') return sold.remainingVisits * CENTS_PER_CREDIT;
  return 0;
}
