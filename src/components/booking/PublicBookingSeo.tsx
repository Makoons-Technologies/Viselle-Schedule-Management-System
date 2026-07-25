import { useEffect } from 'react';
import {
  absoluteUrl,
  applyPageSeo,
  removeHeadNode,
  upsertJsonLd,
  upsertLink,
  upsertMeta,
} from '@/lib/seo';
import type { BookingBranding } from '@/types/api';

export interface PublicBookingSeoProps {
  name: string;
  slug: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  branding?: BookingBranding | null;
  /** When false, ask crawlers not to index (inactive / booking disabled). */
  indexable?: boolean;
  /** Canonical path, e.g. `/book/my-salon`. Defaults to current pathname. */
  canonicalPath?: string;
}

/**
 * SEO / AI discoverability for public booking pages (path and hosted subdomain).
 * Sets title, description, Open Graph, canonical, and LocalBusiness/BeautySalon JSON-LD from real org data only.
 */
export function PublicBookingSeo({
  name,
  slug,
  city,
  address,
  phone,
  branding,
  indexable = true,
  canonicalPath,
}: PublicBookingSeoProps) {
  useEffect(() => {
    const previousTitle = document.title;
    const path = canonicalPath ?? `/book/${slug}`;
    const pageUrl = absoluteUrl(path);
    const description = city
      ? `Book an appointment online with ${name} in ${city}. Choose a service and time that works for you.`
      : `Book an appointment online with ${name}. Choose a service and time that works for you.`;
    const title = city ? `Book with ${name} in ${city}` : `Book with ${name}`;
    const robots = indexable ? 'index,follow' : 'noindex,follow';

    applyPageSeo({
      title,
      description,
      path,
      robots,
      image: branding?.logoUrl ?? null,
      jsonLdId: 'public-booking-jsonld',
    });

    // Prefer the live page URL on hosted subdomains so OG/url matches what users share.
    const shareUrl = window.location.href.split('?')[0] || pageUrl;
    upsertMeta('property', 'og:url', shareUrl);
    upsertMeta('property', 'og:site_name', name);
    upsertLink('canonical', shareUrl);

    if (branding?.faviconUrl) {
      upsertLink('icon', branding.faviconUrl);
    }

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': ['LocalBusiness', 'BeautySalon'],
      name,
      url: shareUrl,
      description,
    };
    if (phone) jsonLd.telephone = phone;
    if (branding?.logoUrl) jsonLd.image = branding.logoUrl;
    if (address || city) {
      jsonLd.address = {
        '@type': 'PostalAddress',
        ...(address ? { streetAddress: address } : {}),
        ...(city ? { addressLocality: city } : {}),
      };
    }
    jsonLd.potentialAction = {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: shareUrl,
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
      result: {
        '@type': 'Reservation',
        name: `Appointment with ${name}`,
      },
    };

    upsertJsonLd('public-booking-jsonld', jsonLd);

    return () => {
      document.title = previousTitle;
      removeHeadNode('public-booking-jsonld');
    };
  }, [
    name,
    slug,
    city,
    address,
    phone,
    branding?.logoUrl,
    branding?.faviconUrl,
    indexable,
    canonicalPath,
  ]);

  return null;
}
