/** Production marketing origin. Override with VITE_SITE_URL when needed. */
export const SITE_ORIGIN = (
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ||
  (import.meta.env.VITE_BOOKING_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://viselle.net'
).replace(/\/$/, '');

export const SITE_NAME = 'Viselle';

export function absoluteUrl(path = '/'): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
}

export function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function upsertLink(rel: string, href: string, attributes?: Record<string, string>) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      el.setAttribute(key, value);
    }
  }
}

export function upsertJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function removeHeadNode(id: string) {
  document.getElementById(id)?.remove();
}

export interface PageSeoInput {
  title: string;
  description: string;
  path: string;
  /** Defaults to index,follow */
  robots?: string;
  ogType?: string;
  image?: string | null;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
  jsonLdId?: string;
}

export function applyPageSeo({
  title,
  description,
  path,
  robots = 'index,follow',
  ogType = 'website',
  image,
  jsonLd,
  jsonLdId = 'page-jsonld',
}: PageSeoInput) {
  const url = absoluteUrl(path);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  document.title = fullTitle;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', robots);
  upsertLink('canonical', url);

  upsertMeta('property', 'og:type', ogType);
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:title', fullTitle);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);

  upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
  upsertMeta('name', 'twitter:title', fullTitle);
  upsertMeta('name', 'twitter:description', description);

  if (image) {
    const imageUrl = absoluteUrl(image);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('name', 'twitter:image', imageUrl);
  }

  if (jsonLd) {
    upsertJsonLd(jsonLdId, jsonLd);
  } else {
    removeHeadNode(jsonLdId);
  }

  return { previousTitle: fullTitle, jsonLdId, url };
}
