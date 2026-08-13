const SITES_BASE_DOMAIN =
  (import.meta.env.VITE_SITES_BASE_DOMAIN as string | undefined) ?? 'viselle.net';

/** Platform hosts on viselle.net that must never be treated as a salon booking site. */
const RESERVED_BOOKING_LABELS = new Set([
  'www',
  'api',
  'staging-api',
  'app',
  'admin',
  'dashboard',
  'sites',
  'static',
  'assets',
  'cdn',
  'mail',
  'status',
  'support',
  'help',
  'docs',
  'blog',
  'login',
  'signup',
  'auth',
  'billing',
  'owner',
  'platform',
  'viselle',
  'makoons',
  'book',
  'booking',
  'manage',
  'public',
  'test',
  'staging',
  'prod',
  'production',
  'dev',
  'demo',
]);

export function getSitesBaseDomain(): string {
  return SITES_BASE_DOMAIN;
}

/** Slug from a hosted booking subdomain (e.g. yourspa.viselle.net → yourspa). */
export function getSubdomainBookingSlug(): string | null {
  const host = window.location.hostname.toLowerCase();
  const base = SITES_BASE_DOMAIN.toLowerCase();
  if (!host.endsWith(`.${base}`)) return null;

  const slug = host.slice(0, -(base.length + 1));
  if (!slug || slug.includes('.')) return null;
  if (RESERVED_BOOKING_LABELS.has(slug)) return null;
  return slug;
}

export function isSubdomainBookingHost(): boolean {
  return getSubdomainBookingSlug() !== null;
}

export function getSubdomainBookingUrl(slug: string, baseDomain = SITES_BASE_DOMAIN): string {
  return `https://${slug}.${baseDomain.replace(/^\.+/, '')}`;
}
