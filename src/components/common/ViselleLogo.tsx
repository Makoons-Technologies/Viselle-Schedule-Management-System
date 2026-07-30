import { cn } from '@/lib/utils';

/**
 * Cache-bust so browsers/Vite don't keep serving an older raster that had a
 * baked-in grey disc (see commits that temporarily added a disc fill).
 * Bump when the mark asset changes.
 */
export const VISELLE_LOGO_CACHE_BUST = '20260730c';

/**
 * Flattened SVG (paths with inline gradient fills) — no background rect/disc.
 * Prefer SVG over PNG so a URL change forces a fresh fetch after prior PNG disc assets.
 */
export const VISELLE_LOGO_SRC = `/viselle-logo.svg?v=${VISELLE_LOGO_CACHE_BUST}`;

type ViselleLogoProps = {
  className?: string;
  /** Pixel size for width/height; defaults to 36. */
  size?: number;
  alt?: string;
};

/** Product logo. Transparent SVG so gold reads on any chrome without a baked-in disc. */
export function ViselleLogo({ className, size = 36, alt = 'Viselle' }: ViselleLogoProps) {
  return (
    <img
      src={VISELLE_LOGO_SRC}
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0 object-contain bg-transparent', className)}
      decoding="async"
    />
  );
}
