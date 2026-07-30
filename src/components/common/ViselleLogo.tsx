import { cn } from '@/lib/utils';

/**
 * Official Viselle mark as PNG — gold V on a light grey disc.
 * SVG is kept for favicon; Illustrator CSS/xlink gradients do not paint under <img>.
 */
export const VISELLE_LOGO_SRC = '/viselle-logo.png';

type ViselleLogoProps = {
  className?: string;
  /** Pixel size for width/height; defaults to 36. */
  size?: number;
  alt?: string;
};

/**
 * Product logo. PNG includes its own light disc so gold stays readable on
 * dark chrome and light marketing pages.
 */
export function ViselleLogo({ className, size = 36, alt = 'Viselle' }: ViselleLogoProps) {
  return (
    <img
      src={VISELLE_LOGO_SRC}
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full object-contain', className)}
      decoding="async"
    />
  );
}
