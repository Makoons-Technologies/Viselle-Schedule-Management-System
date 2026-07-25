/**
 * @deprecated Prefer `@/lib/plan-features` — kept for existing imports.
 */
import { toLegacyPricingTiers, type PlanTierId } from '@/lib/plan-features';

export type PricingTierId = PlanTierId;

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

export const PRICING_TIERS: PricingTier[] = toLegacyPricingTiers();
