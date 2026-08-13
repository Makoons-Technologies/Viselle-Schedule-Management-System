const ENV_SITES_BASE_DOMAIN =
  (import.meta.env.VITE_SITES_BASE_DOMAIN as string | undefined) ?? 'viselle.net';

const CANONICAL_SITES_BASE = 'viselle.net';

const LEGACY_SITES_BASES = new Set(['sites.viselle.net', 'sites-staging.viselle.net']);

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

function normalizeSitesBase(value: string): string {
  const base = value.replace(/^\.+/, '').toLowerCase();
  if (LEGACY_SITES_BASES.has(base)) return CANONICAL_SITES_BASE;
  return base || CANONICAL_SITES_BASE;
}

export function getSitesBaseDomain(): string {
  return normalizeSitesBase(ENV_SITES_BASE_DOMAIN);
}

function bookingBases(): string[] {
  return Array.from(new Set([getSitesBaseDomain(), CANONICAL_SITES_BASE]));
}

/** Slug from a hosted booking subdomain (e.g. yourspa.viselle.net → yourspa). */
export function getSubdomainBookingSlug(): string | null {
  const host = window.location.hostname.toLowerCase();
  for (const base of bookingBases()) {
    if (!host.endsWith(`.${base}`)) continue;
    const slug = host.slice(0, -(base.length + 1));
    if (!slug || slug.includes('.')) continue;
    if (RESERVED_BOOKING_LABELS.has(slug)) continue;
    return slug;
  }
  return null;
}

export function isSubdomainBookingHost(): boolean {
  return getSubdomainBookingSlug() !== null;
}

export function getSubdomainBookingUrl(slug: string, baseDomain = getSitesBaseDomain()): string {
  return `https://${slug}.${normalizeSitesBase(baseDomain)}`;
}
