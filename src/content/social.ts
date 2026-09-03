/**
 * Official Viselle social profiles — single source of truth for marketing chrome,
 * JSON-LD sameAs, and llms.txt.
 *
 * Instagram / TikTok handle is @getviselle. Do not invent @viselle or X/Twitter.
 * Facebook has no vanity handle yet; use the resolved Page URL (share link
 * https://www.facebook.com/share/1EkHru7jFB/ → people/Viselle/61593664348103).
 */

export type ViselleSocialNetwork = 'instagram' | 'tiktok' | 'facebook' | 'linkedin';

export interface ViselleSocialLink {
  id: ViselleSocialNetwork;
  label: string;
  href: string;
}

export const VISELLE_SOCIAL_LINKS: readonly ViselleSocialLink[] = [
  {
    id: 'instagram',
    label: 'Viselle on Instagram',
    href: 'https://www.instagram.com/getviselle',
  },
  {
    id: 'tiktok',
    label: 'Viselle on TikTok',
    href: 'https://www.tiktok.com/@getviselle',
  },
  {
    id: 'facebook',
    label: 'Viselle on Facebook',
    href: 'https://www.facebook.com/people/Viselle/61593664348103/',
  },
  {
    id: 'linkedin',
    label: 'Viselle on LinkedIn',
    href: 'https://www.linkedin.com/company/viselle/',
  },
] as const;

/** Schema.org sameAs list — Organization and SoftwareApplication. */
export const VISELLE_SOCIAL_SAME_AS: readonly string[] = VISELLE_SOCIAL_LINKS.map(
  (link) => link.href,
);
