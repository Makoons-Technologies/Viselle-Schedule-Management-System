/** Matches Tailwind `mobile-shell` — portrait phones + landscape phones (short height). */
export const MOBILE_SHELL_MEDIA =
  '(max-width: 767px), ((orientation: landscape) and (max-height: 767px))';

/** Matches Tailwind `desktop-shell`. */
export const DESKTOP_SHELL_MEDIA = '(min-width: 768px) and (min-height: 768px)';
