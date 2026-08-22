import type { BookingPaymentMode, FirstVisitPaymentMode, OwnerFirstVisitPayment } from '@/types/api';
import { dollarsToCents, formatCurrency } from '@/lib/utils';

export const DEFAULT_FIRST_VISIT_DEPOSIT_CENTS = 2500;
export const MIN_FIRST_VISIT_DEPOSIT_CENTS = 100;
export const MAX_FIRST_VISIT_DEPOSIT_CENTS = 100_000;

export function readOwnerFirstVisitPayment(
  value: OwnerFirstVisitPayment | null | undefined,
): OwnerFirstVisitPayment {
  if (!value) {
    return {
      mode: 'off',
      depositCents: DEFAULT_FIRST_VISIT_DEPOSIT_CENTS,
      stripeReady: false,
      stripeAccountId: null,
      publishableKey: null,
    };
  }
  return {
    mode: value.mode === 'deposit' || value.mode === 'card_on_file' ? value.mode : 'off',
    depositCents:
      value.mode === 'deposit' && value.depositCents && value.depositCents > 0
        ? value.depositCents
        : value.depositCents ?? DEFAULT_FIRST_VISIT_DEPOSIT_CENTS,
    stripeReady: Boolean(value.stripeReady),
    stripeAccountId: value.stripeAccountId ?? null,
    publishableKey: value.publishableKey ?? null,
  };
}

export function parseDepositDollars(raw: string): number | null {
  const trimmed = raw.trim().replace(/^\$/, '');
  if (!trimmed) return null;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars)) return null;
  const cents = dollarsToCents(dollars);
  if (cents < MIN_FIRST_VISIT_DEPOSIT_CENTS || cents > MAX_FIRST_VISIT_DEPOSIT_CENTS) return null;
  return cents;
}

export function depositDollarsInput(cents: number | null | undefined): string {
  const value = cents && cents > 0 ? cents : DEFAULT_FIRST_VISIT_DEPOSIT_CENTS;
  return (value / 100).toFixed(2);
}

export function firstVisitPaymentHeadline(mode: FirstVisitPaymentMode, depositCents?: number | null): string {
  if (mode === 'card_on_file') return 'Card required to hold a first visit';
  if (mode === 'deposit') {
    return depositCents
      ? `${formatCurrency(depositCents)} deposit due for a first visit`
      : 'Deposit due for a first visit';
  }
  return '';
}

export function firstVisitPaymentClientCopy(mode: BookingPaymentMode, depositCents?: number | null): string {
  if (mode === 'card_on_file') {
    return 'New clients save a card to hold this appointment. The studio can charge a no-show fee if you miss it. Returning clients skip this step.';
  }
  const amount = depositCents ? formatCurrency(depositCents) : 'A deposit';
  return `${amount} is charged now for a first visit. It is applied to your appointment if you show, or kept if you no-show. Returning clients skip this step.`;
}

export function firstVisitBookLabel(
  mode: BookingPaymentMode,
  depositCents?: number | null,
  pending?: boolean,
): string {
  if (pending) return mode === 'deposit' ? 'Paying…' : 'Saving card…';
  if (mode === 'card_on_file') return 'Save card and book';
  return depositCents ? `Pay ${formatCurrency(depositCents)} and book` : 'Pay deposit and book';
}

export function firstVisitConfirmCopy(mode: BookingPaymentMode, depositCents?: number | null): string {
  if (mode === 'card_on_file') {
    return 'Your card is on file to hold this first visit.';
  }
  return depositCents
    ? `Your ${formatCurrency(depositCents)} deposit is paid and will apply to this visit.`
    : 'Your deposit is paid and will apply to this visit.';
}

export function intentTypeForMode(mode: BookingPaymentMode): 'payment' | 'setup' {
  return mode === 'card_on_file' ? 'setup' : 'payment';
}
