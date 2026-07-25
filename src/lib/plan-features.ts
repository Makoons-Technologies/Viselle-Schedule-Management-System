/**
 * Single plan/feature catalog for homepage pricing + in-app plan comparison.
 * Keep in sync with Beauty-Backend-API `src/config/plan-features.ts`.
 */

export type PlanTierId = 'starter' | 'professional' | 'business';

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  /** Tiers that include this feature */
  tiers: PlanTierId[];
}

export interface PlanTierMarketing {
  id: PlanTierId;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  staffLimitLabel: string;
  highlighted?: boolean;
}

export const PLAN_TIER_ORDER: PlanTierId[] = ['starter', 'professional', 'business'];

export const PLAN_TIER_RANK: Record<PlanTierId, number> = {
  starter: 0,
  professional: 1,
  business: 2,
};

export const PLAN_FEATURES: PlanFeature[] = [
  {
    id: 'online_calendar',
    name: 'Online calendar & appointments',
    description: 'Day-to-day scheduling for your team with a shared calendar view.',
    tiers: ['starter', 'professional', 'business'],
  },
  {
    id: 'booking_page',
    name: 'Free booking page',
    description: 'A public page at viselle.app/book/your-business so clients can book online.',
    tiers: ['starter', 'professional', 'business'],
  },
  {
    id: 'services_availability',
    name: 'Services & availability setup',
    description: 'Configure services, durations, prices, and when each staff member is bookable.',
    tiers: ['starter', 'professional', 'business'],
  },
  {
    id: 'email_reminders',
    name: 'Email appointment reminders',
    description: 'Automatic email reminders before appointments to cut no-shows.',
    tiers: ['starter', 'professional', 'business'],
  },
  {
    id: 'sms_reminders',
    name: 'Text (SMS) reminders',
    description: 'Send appointment reminders by text message in addition to email.',
    tiers: ['professional', 'business'],
  },
  {
    id: 'recurring_appointments',
    name: 'Recurring appointments',
    description: 'Book repeating visits (weekly, biweekly, and similar patterns) in one flow.',
    tiers: ['professional', 'business'],
  },
  {
    id: 'multi_staff',
    name: 'Multiple staff schedules',
    description: 'Run several staff calendars under one business with per-person availability.',
    tiers: ['professional', 'business'],
  },
  {
    id: 'unlimited_staff',
    name: 'Unlimited staff accounts',
    description: 'No staff seat cap — add as many team members as you need.',
    tiers: ['business'],
  },
  {
    id: 'priority_support',
    name: 'Priority support',
    description: 'Faster responses when you need help from the Viselle team.',
    tiers: ['business'],
  },
  {
    id: 'advanced_booking',
    name: 'Advanced booking controls',
    description: 'Higher limits and controls suited to busy multi-staff operations.',
    tiers: ['business'],
  },
];

export const PLAN_TIERS: PlanTierMarketing[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Solo stylists & small booths',
    monthlyPriceCents: 2000,
    staffLimitLabel: 'Up to 2 staff',
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'Growing salons & spas',
    monthlyPriceCents: 4900,
    staffLimitLabel: 'Up to 10 staff',
    highlighted: true,
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Busy teams & multi-location',
    monthlyPriceCents: 9900,
    staffLimitLabel: 'Unlimited staff',
  },
];

export function tierIncludesFeature(tier: PlanTierId, featureId: string): boolean {
  const feature = PLAN_FEATURES.find((f) => f.id === featureId);
  return feature ? feature.tiers.includes(tier) : false;
}

export function featuresForTier(tier: PlanTierId): PlanFeature[] {
  return PLAN_FEATURES.filter((f) => f.tiers.includes(tier));
}

export function featuresMissingFromTier(tier: PlanTierId): PlanFeature[] {
  return PLAN_FEATURES.filter((f) => !f.tiers.includes(tier));
}

export function getPlanTier(tier: PlanTierId): PlanTierMarketing {
  const found = PLAN_TIERS.find((t) => t.id === tier);
  if (!found) throw new Error(`Unknown plan tier: ${tier}`);
  return found;
}

export function compareTierChange(
  from: PlanTierId | null | undefined,
  to: PlanTierId,
): 'upgrade' | 'downgrade' | 'same' | 'switch' {
  if (!from || from === to) return from === to ? 'same' : 'switch';
  const fromRank = PLAN_TIER_RANK[from];
  const toRank = PLAN_TIER_RANK[to];
  if (toRank > fromRank) return 'upgrade';
  if (toRank < fromRank) return 'downgrade';
  return 'same';
}

export function priceMonthlyDollars(tier: PlanTierMarketing): number {
  return tier.monthlyPriceCents / 100;
}

/** Legacy card shape used by a few admin selects. */
export function toLegacyPricingTiers() {
  return PLAN_TIERS.map((tier) => ({
    id: tier.id,
    name: tier.name,
    tagline: tier.tagline,
    priceMonthly: priceMonthlyDollars(tier),
    staffLimit: tier.staffLimitLabel,
    highlighted: tier.highlighted,
    features: featuresForTier(tier.id).map((f) => f.name),
    notIncluded: featuresMissingFromTier(tier.id).map((f) => f.name),
  }));
}
