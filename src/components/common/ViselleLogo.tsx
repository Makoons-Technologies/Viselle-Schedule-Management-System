import { cn } from '@/lib/utils';

/** Official Viselle mark — gold serif V in circular frame (vector SVG, transparent bg). */
export const VISELLE_LOGO_SRC = '/viselle-logo.svg';

type ViselleLogoProps = {
  className?: string;
  /** Pixel size for width/height; defaults to 36. */
  size?: number;
  alt?: string;
};

/**
 * Product logo. Black circular disc behind the transparent SVG so the mark
 * matches the gold-on-black brand lockup on light chrome.
 */
export function ViselleLogo({ className, size = 36, alt = 'Viselle' }: ViselleLogoProps) {
  return (
    <img
      src={VISELLE_LOGO_SRC}
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full object-contain bg-black p-[12%]', className)}
      decoding="async"
    />
  );
}
