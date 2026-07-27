import { cn } from '@/lib/utils';

/** Official Viselle mark — gold serif V in circular frame (asset has a black background). */
export const VISELLE_LOGO_SRC = '/viselle-logo.png';

type ViselleLogoProps = {
  className?: string;
  /** Pixel size for width/height; defaults to 36. */
  size?: number;
  alt?: string;
};

/**
 * Product logo. Clipped to a circle so the source black square reads as a
 * circular mark on light chrome (matches the logo's circular frame).
 */
export function ViselleLogo({ className, size = 36, alt = 'Viselle' }: ViselleLogoProps) {
  return (
    <img
      src={VISELLE_LOGO_SRC}
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full object-cover bg-black', className)}
      decoding="async"
    />
  );
}
