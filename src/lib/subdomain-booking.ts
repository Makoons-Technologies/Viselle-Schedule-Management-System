const SITES_BASE_DOMAIN =
  (import.meta.env.VITE_SITES_BASE_DOMAIN as string | undefined) ?? 'sites.viselle.net';

export function getSitesBaseDomain(): string {
  return SITES_BASE_DOMAIN;
}

/** Slug from a hosted booking subdomain (e.g. yourspa.sites.viselle.app → yourspa). */
export function getSubdomainBookingSlug(): string | null {
  const host = window.location.hostname.toLowerCase();
  const base = SITES_BASE_DOMAIN.toLowerCase();
  if (!host.endsWith(`.${base}`)) return null;

  const slug = host.slice(0, -(base.length + 1));
  if (!slug || slug.includes('.')) return null;
  return slug;
}

export function isSubdomainBookingHost(): boolean {
  return getSubdomainBookingSlug() !== null;
}

export function getSubdomainBookingUrl(slug: string, baseDomain = SITES_BASE_DOMAIN): string {
  return `https://${slug}.${baseDomain.replace(/^\.+/, '')}`;
}
