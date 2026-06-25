import type { PricingTierId } from './pricing';

export type ContactInterest =
  | 'general'
  | `plan-${PricingTierId}`
  | 'subdomain'
  | 'api'
  | 'upgrade';

export const CONTACT_INTEREST_LABELS: Record<ContactInterest, string> = {
  general: 'General question',
  'plan-starter': 'Starter plan ($29/mo)',
  'plan-professional': 'Professional plan ($49/mo)',
  'plan-business': 'Business plan ($99/mo)',
  subdomain: 'Hosted subdomain & website design',
  api: 'My website + booking API',
  upgrade: 'Upgrade my current plan',
};

export const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? 'hello@viselle.app';

export function contactPath(params?: {
  interest?: ContactInterest;
  slug?: string;
}): string {
  const search = new URLSearchParams();
  if (params?.interest) search.set('interest', params.interest);
  if (params?.slug) search.set('slug', params.slug);
  const query = search.toString();
  return query ? `/contact?${query}` : '/contact';
}

export function parseContactInterest(value: string | null): ContactInterest {
  if (value && value in CONTACT_INTEREST_LABELS) {
    return value as ContactInterest;
  }
  return 'general';
}

export function buildContactMailto(data: {
  interest: ContactInterest;
  name: string;
  email: string;
  businessName?: string;
  phone?: string;
  message?: string;
  businessSlug?: string;
}): string {
  const subject = `Viselle — ${CONTACT_INTEREST_LABELS[data.interest]}`;
  const body = [
    `Interest: ${CONTACT_INTEREST_LABELS[data.interest]}`,
    data.businessSlug ? `Business slug: ${data.businessSlug}` : '',
    '',
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    data.businessName ? `Business: ${data.businessName}` : '',
    data.phone ? `Phone: ${data.phone}` : '',
    '',
    data.message ? `Message:\n${data.message}` : '',
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
