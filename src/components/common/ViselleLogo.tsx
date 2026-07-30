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
 * Product logo. Light stone disc behind the transparent SVG so the gold mark
 * stays visible on both dark chrome and light pages (charcoal discs vanish).
 */
export function ViselleLogo({ className, size = 36, alt = 'Viselle' }: ViselleLogoProps) {
  return (
    <img
      src={VISELLE_LOGO_SRC}
      alt={alt}
      width={size}
      height={size}
      className={cn(
        'shrink-0 rounded-full object-contain bg-stone-300 p-[12%] ring-1 ring-stone-500/35',
        className,
      )}
      decoding="async"
    />
  );
}
