import axios from 'axios';
import { ApiError, getFallbackRequestErrorMessage } from '@/lib/api';
import { getPlanTier } from '@/lib/plan-features';
import type { ResolvedTrialOffer, TrialCampaign, TrialPaymentMode } from '@/types/api';

const signupClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  headers: { 'Content-Type': 'application/json' },
});

signupClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    if (data?.error) {
      throw new ApiError(
        data.error.code,
        data.error.message,
        error.response?.status ?? 500,
        data.error.details,
      );
    }
    throw new ApiError(
      error.response?.status && error.response.status >= 500 ? 'SERVER_ERROR' : 'NETWORK_ERROR',
      getFallbackRequestErrorMessage(error),
      error.response?.status ?? 0,
    );
  },
);

export type SignupTierId = 'starter' | 'professional' | 'business';

export interface SignupCatalogPlan {
  id: SignupTierId;
  name: string;
  description: string;
  monthlyPriceCents: number;
  staffLimit: string;
  features: string[];
}

export type SignupWebsiteOption = 'free' | 'subdomain' | 'custom_website';

export interface SignupCatalogAddon {
  id: 'subdomain' | 'custom_website';
  name: string;
  description: string;
  priceCents: number | null;
  priceLabel?: string;
  interval: 'month' | 'once' | 'quote';
  selfServe: boolean;
}

export interface SignupCart {
  items: Array<{
    id: string;
    name: string;
    amountCents: number;
    interval: 'month' | 'once' | 'quote';
    priceLabel?: string;
  }>;
  dueTodayCents: number;
  monthlyRecurringCents: number;
}

export function websiteOptionFromParams(params?: {
  subdomain?: boolean;
  customWebsite?: boolean;
}): SignupWebsiteOption {
  if (params?.customWebsite) return 'custom_website';
  if (params?.subdomain) return 'subdomain';
  return 'free';
}

export function websiteOptionToAddons(option: SignupWebsiteOption): {
  subdomainAddon: boolean;
  customWebsiteAddon: boolean;
} {
  return {
    subdomainAddon: option === 'subdomain',
    customWebsiteAddon: option === 'custom_website',
  };
}

export function slugifyBusinessName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

const LOCAL_SIGNUP_ADDONS: Record<
  SignupCatalogAddon['id'],
  Pick<SignupCatalogAddon, 'id' | 'name' | 'interval' | 'priceLabel'>
> = {
  subdomain: { id: 'subdomain', name: 'Hosted subdomain', interval: 'quote', priceLabel: 'TBD' },
  custom_website: {
    id: 'custom_website',
    name: 'Custom website build',
    interval: 'quote',
    priceLabel: 'To be determined',
  },
};

/**
 * Local cart that matches Beauty-Backend-API `calculateSignupCart`.
 * Used so trial codes can resolve Due today to $0 without waiting on /signup/cart/preview
 * (that route is a pure calc, but a failed/hung preview used to leave the UI on Calculating).
 */
export function calculateSignupCart(input: {
  tier: SignupTierId;
  subdomainAddon: boolean;
  customWebsiteAddon: boolean;
  trialPaymentMode?: TrialPaymentMode | null;
}): SignupCart {
  const plan = getPlanTier(input.tier);
  const items: SignupCart['items'] = [
    {
      id: `plan-${input.tier}`,
      name: `${plan.name} plan`,
      amountCents: plan.monthlyPriceCents,
      interval: 'month',
    },
  ];

  if (input.customWebsiteAddon) {
    const addon = LOCAL_SIGNUP_ADDONS.custom_website;
    items.push({
      id: addon.id,
      name: addon.name,
      amountCents: 0,
      interval: addon.interval,
      priceLabel: addon.priceLabel,
    });
    items.push({
      id: 'included-booking-page',
      name: 'Free booking page (until your site launches)',
      amountCents: 0,
      interval: 'once',
    });
  } else if (input.subdomainAddon) {
    const addon = LOCAL_SIGNUP_ADDONS.subdomain;
    items.push({
      id: addon.id,
      name: addon.name,
      amountCents: 0,
      interval: addon.interval,
      priceLabel: addon.priceLabel,
    });
  } else {
    items.push({
      id: 'included-booking-page',
      name: 'Free booking page',
      amountCents: 0,
      interval: 'once',
    });
  }

  const monthlyRecurringCents = items
    .filter((item) => item.interval === 'month')
    .reduce((sum, item) => sum + item.amountCents, 0);

  return {
    items,
    dueTodayCents: input.trialPaymentMode ? 0 : monthlyRecurringCents,
    monthlyRecurringCents,
  };
}

export function getStartedPath(params?: {
  plan?: SignupTierId;
  subdomain?: boolean;
  customWebsite?: boolean;
  code?: string;
  trial?: boolean;
}): string {
  const search = new URLSearchParams();
  if (params?.plan) search.set('plan', params.plan);
  if (params?.subdomain) search.set('subdomain', '1');
  if (params?.customWebsite) search.set('customWebsite', '1');
  if (params?.code) search.set('code', params.code);
  if (params?.trial) search.set('trial', '1');
  const query = search.toString();
  return query ? `/get-started?${query}` : '/get-started';
}

export async function fetchSignupCatalog() {
  const { data } = await signupClient.get<{
    catalog: {
      plans: SignupCatalogPlan[];
      addons: SignupCatalogAddon[];
      included: { name: string; description: string };
      contactOnly: { id: string; name: string; description: string };
    };
  }>('/signup/catalog');
  return data.catalog;
}

export async function previewSignupCart(input: {
  tier: SignupTierId;
  subdomainAddon: boolean;
  customWebsiteAddon: boolean;
  trialPaymentMode?: TrialPaymentMode | null;
}) {
  const body = {
    tier: input.tier,
    subdomainAddon: input.subdomainAddon,
    customWebsiteAddon: input.customWebsiteAddon,
    ...(input.trialPaymentMode ? { trialPaymentMode: input.trialPaymentMode } : {}),
  };
  const { data } = await signupClient.post<{ cart: SignupCart }>('/signup/cart/preview', body, {
    timeout: 8000,
  });
  return data.cart;
}

export async function checkSlugAvailable(slug: string) {
  const { data } = await signupClient.get<{ available: boolean }>(`/signup/slug/${encodeURIComponent(slug)}/available`);
  return data.available;
}

export async function checkEmailAvailable(email: string) {
  const { data } = await signupClient.get<{ available: boolean }>('/signup/email/available', {
    params: { email },
  });
  return data.available;
}

export interface SignupCheckoutResult {
  checkoutUrl?: string;
  sessionId?: string;
  cart: SignupCart;
  provisioned?: boolean;
  organizationId?: string;
  slug?: string;
}

export async function createSignupCheckout(input: {
  businessName: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
  tier: SignupTierId;
  subdomainAddon: boolean;
  customWebsiteAddon: boolean;
  code?: string;
  useHomepageCampaign?: boolean;
}) {
  const { data } = await signupClient.post<SignupCheckoutResult>('/signup/checkout', input);
  return data;
}

export async function validateTrialCode(code: string) {
  const { data } = await signupClient.get<{ offer: ResolvedTrialOffer }>('/signup/trials/validate', {
    params: { code },
  });
  return data.offer;
}

export async function fetchLiveHomepageTrial() {
  const { data } = await signupClient.get<{ campaign: TrialCampaign | null }>('/signup/trials/homepage');
  return data.campaign;
}

/** Platform-assigned (or `?code=` override) campaign for the digital business card. */
export async function fetchBusinessCardCampaign(code?: string | null) {
  const { data } = await signupClient.get<{ campaign: TrialCampaign | null }>('/signup/trials/business-card', {
    params: code ? { code } : undefined,
  });
  return data.campaign;
}

export async function getSignupSessionStatus(sessionId: string) {
  const { data } = await signupClient.get<{
    status: 'pending' | 'completed' | 'expired' | 'failed';
    organizationId?: string | null;
    slug: string;
    ownerEmail: string;
  }>(`/signup/session/${encodeURIComponent(sessionId)}`);
  return data;
}
