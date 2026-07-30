import { cn } from '@/lib/utils';

/**
 * Official Viselle mark as PNG — gold artwork on a transparent square.
 * SVG is kept for favicon; Illustrator CSS/xlink gradients do not paint under <img>.
 */
export const VISELLE_LOGO_SRC = '/viselle-logo.png';

type ViselleLogoProps = {
  className?: string;
  /** Pixel size for width/height; defaults to 36. */
  size?: number;
  alt?: string;
};

/** Product logo. Transparent PNG so gold reads on any chrome without a baked-in disc. */
export function ViselleLogo({ className, size = 36, alt = 'Viselle' }: ViselleLogoProps) {
  return (
    <img
      src={VISELLE_LOGO_SRC}
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      decoding="async"
    />
  );
}
