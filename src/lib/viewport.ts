/** Matches Tailwind `mobile-shell` — phones in portrait, or landscape under 1024px. */
export const MOBILE_SHELL_MEDIA =
  '(max-width: 767px), ((max-width: 1023px) and (max-height: 767px))';

/** Matches Tailwind `desktop-shell` — tablets/desktops, including wide short windows. */
export const DESKTOP_SHELL_MEDIA =
  '(min-width: 1024px), ((min-width: 768px) and (min-height: 768px))';

export function isDesktopShellViewport(width: number, height: number) {
  return width >= 1024 || (width >= 768 && height >= 768);
}

export function isMobileShellViewport(width: number, height: number) {
  return width <= 767 || (width <= 1023 && height <= 767);
}
