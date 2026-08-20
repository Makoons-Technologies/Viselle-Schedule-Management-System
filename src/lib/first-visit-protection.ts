import type { FirstVisitProtection, FirstVisitProtectionMode } from '@/types/api';
import { dollarsToCents, formatCurrency } from '@/lib/utils';

export const DEFAULT_FIRST_VISIT_DEPOSIT_CENTS = 2500;
export const MIN_FIRST_VISIT_DEPOSIT_CENTS = 500;
export const MAX_FIRST_VISIT_DEPOSIT_CENTS = 50_000;

export const FIRST_VISIT_PROTECTION_API_HINT =
  'Staging API does not persist first-visit protection yet. Beauty-Backend-API needs PATCH /organizations/:id { firstVisitProtection } and GET/POST /public/organizations/:slug firstVisitProtection.';

export function normalizeFirstVisitProtection(
  value: FirstVisitProtection | null | undefined,
): FirstVisitProtection {
  if (!value) {
    return {
      enabled: false,
      mode: 'deposit',
      depositCents: DEFAULT_FIRST_VISIT_DEPOSIT_CENTS,
    };
  }
  return {
    enabled: Boolean(value.enabled),
    mode: value.mode === 'card_on_file' ? 'card_on_file' : 'deposit',
    depositCents:
      value.mode === 'card_on_file'
        ? value.depositCents ?? null
        : value.depositCents && value.depositCents > 0
          ? value.depositCents
          : DEFAULT_FIRST_VISIT_DEPOSIT_CENTS,
  };
}

export function protectionEquals(a: FirstVisitProtection, b: FirstVisitProtection | null | undefined): boolean {
  if (!b) return false;
  return a.enabled === b.enabled && a.mode === b.mode && (a.depositCents ?? null) === (b.depositCents ?? null);
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

export function firstVisitProtectionHeadline(mode: FirstVisitProtectionMode, depositCents?: number | null): string {
  if (mode === 'card_on_file') return 'Card required to hold a first visit';
  return depositCents
    ? `${formatCurrency(depositCents)} deposit due for a first visit`
    : 'Deposit due for a first visit';
}

export function firstVisitProtectionClientCopy(mode: FirstVisitProtectionMode, depositCents?: number | null): string {
  if (mode === 'card_on_file') {
    return 'New clients save a card to hold this appointment. The studio can charge a no-show fee if you miss it. Returning clients skip this step.';
  }
  const amount = depositCents ? formatCurrency(depositCents) : 'A deposit';
  return `${amount} is charged now for a first visit. It is applied to your appointment if you show, or kept if you no-show. Returning clients skip this step.`;
}

export function firstVisitBookLabel(
  mode: FirstVisitProtectionMode,
  depositCents?: number | null,
  pending?: boolean,
): string {
  if (pending) return mode === 'deposit' ? 'Paying…' : 'Saving card…';
  if (mode === 'card_on_file') return 'Save card and book';
  return depositCents ? `Pay ${formatCurrency(depositCents)} and book` : 'Pay deposit and book';
}

export function firstVisitConfirmCopy(mode: FirstVisitProtectionMode, depositCents?: number | null): string {
  if (mode === 'card_on_file') {
    return 'Your card is on file to hold this first visit.';
  }
  return depositCents
    ? `Your ${formatCurrency(depositCents)} deposit is paid and will apply to this visit.`
    : 'Your deposit is paid and will apply to this visit.';
}

export function intentIdFromClientSecret(clientSecret: string): string {
  const [id] = clientSecret.split('_secret_');
  return id ?? clientSecret;
}
