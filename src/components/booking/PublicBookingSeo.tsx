import { useEffect } from 'react';
import { isSubdomainBookingHost } from '@/lib/subdomain-booking';
import type { BookingBranding } from '@/types/api';

export interface PublicBookingSeoProps {
  name: string;
  slug: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  branding?: BookingBranding | null;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(id: string, data: Record<string, unknown>) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * SEO / AI discoverability for public booking pages (especially hosted subdomain hosts).
 * Sets title, description, Open Graph, and LocalBusiness JSON-LD from real org data only.
 */
export function PublicBookingSeo({
  name,
  slug,
  city,
  address,
  phone,
  branding,
}: PublicBookingSeoProps) {
  useEffect(() => {
    const previousTitle = document.title;
    const pageUrl = window.location.href.split('?')[0];
    const description = city
      ? `Book an appointment online with ${name} in ${city}. Choose a service and time that works for you.`
      : `Book an appointment online with ${name}. Choose a service and time that works for you.`;
    const title = `Book with ${name}`;
    const isSubdomain = isSubdomainBookingHost();

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', isSubdomain ? 'index,follow' : 'index,follow');
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', pageUrl);
    upsertMeta('property', 'og:site_name', name);
    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);

    if (branding?.logoUrl) {
      upsertMeta('property', 'og:image', branding.logoUrl);
      upsertMeta('name', 'twitter:image', branding.logoUrl);
    }
    if (branding?.faviconUrl) {
      upsertLink('icon', branding.faviconUrl);
    }

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name,
      url: pageUrl,
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
        urlTemplate: pageUrl,
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
      const script = document.getElementById('public-booking-jsonld');
      script?.remove();
    };
  }, [name, slug, city, address, phone, branding?.logoUrl, branding?.faviconUrl]);

  return null;
}
