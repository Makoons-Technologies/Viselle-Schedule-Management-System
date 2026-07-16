export type PricingTierId = 'starter' | 'professional' | 'business';

export interface PricingTier {
  id: PricingTierId;
  name: string;
  tagline: string;
  priceMonthly: number;
  staffLimit: string;
  features: string[];
  notIncluded?: string[];
  highlighted?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Solo stylists & small booths',
    priceMonthly: 20,
    staffLimit: 'Up to 2 staff',
    features: [
      'Online calendar & appointments',
      'Free booking page included',
      'Email appointment reminders',
      'Services & availability setup',
    ],
    notIncluded: ['Text (SMS) reminders', 'Recurring appointments'],
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'Growing salons & spas',
    priceMonthly: 49,
    staffLimit: 'Up to 10 staff',
    highlighted: true,
    features: [
      'Everything in Starter',
      'Text (SMS) reminders',
      'Recurring appointments',
      'Multiple staff schedules',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Busy teams & multi-location',
    priceMonthly: 99,
    staffLimit: 'Unlimited staff',
    features: [
      'Everything in Professional',
      'Unlimited staff accounts',
      'Priority support',
      'Advanced booking controls',
    ],
  },
];
