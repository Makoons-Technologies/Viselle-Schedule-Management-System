import axios from 'axios';
import { ApiError } from '@/lib/api';
import type { ResolvedTrialOffer, TrialCampaign } from '@/types/api';

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
    throw new ApiError('NETWORK_ERROR', error.message || 'Network request failed', error.response?.status ?? 0);
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
  trialPaymentMode?: 'stripe_trial' | 'free_no_card' | null;
}) {
  const { data } = await signupClient.post<{ cart: SignupCart }>('/signup/cart/preview', input);
  return data.cart;
}

export async function checkSlugAvailable(slug: string) {
  const { data } = await signupClient.get<{ available: boolean }>(`/signup/slug/${encodeURIComponent(slug)}/available`);
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
