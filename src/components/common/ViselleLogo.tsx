import { cn } from '@/lib/utils';

/**
 * Cache-bust so browsers/Vite don't keep serving an older raster that had a
 * baked-in grey disc (see commits that temporarily added a disc fill).
 * Bump when the mark asset changes.
 */
export const VISELLE_LOGO_CACHE_BUST = '20260730d';

/** Flattened SVG (paths with inline gradient fills) — no background rect/disc. */
export const VISELLE_LOGO_SVG_SRC = `/viselle-logo.svg?v=${VISELLE_LOGO_CACHE_BUST}`;

/**
 * High-res transparent PNG (1024×1024). Prefer for large display sizes where
 * Illustrator metallic SVG strokes soft-antialias and look blurry.
 */
export const VISELLE_LOGO_PNG_SRC = `/viselle-logo.png?v=${VISELLE_LOGO_CACHE_BUST}`;

/** @deprecated Prefer VISELLE_LOGO_SVG_SRC; kept for any external imports. */
export const VISELLE_LOGO_SRC = VISELLE_LOGO_SVG_SRC;

/** Above this CSS size, use the 1024 PNG so retina/large heroes stay sharp. */
const RASTER_MIN_SIZE = 96;

type ViselleLogoProps = {
  className?: string;
  /** Pixel size for width/height; defaults to 36. */
  size?: number;
  alt?: string;
};

/** Product logo. Transparent mark — SVG for small chrome, PNG for large/hero. */
export function ViselleLogo({ className, size = 36, alt = 'Viselle' }: ViselleLogoProps) {
  const useRaster = size >= RASTER_MIN_SIZE;

  return (
    <img
      src={useRaster ? VISELLE_LOGO_PNG_SRC : VISELLE_LOGO_SVG_SRC}
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0 object-contain bg-transparent', className)}
      decoding="async"
    />
  );
}
