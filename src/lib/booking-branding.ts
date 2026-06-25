import type { CSSProperties } from 'react';
import type { BookingBranding, SiteTemplate, ThemeColorPalette } from '@/types/api';

export const DEFAULT_UI_OPACITY = 0.94;

export const DEFAULT_THEME_PALETTES: Record<SiteTemplate, ThemeColorPalette> = {
  classic: {
    primary: '#2563eb',
    page: '#f5f5f4',
    header: '#ffffff',
    headerText: '#1c1917',
    card: '#ffffff',
    text: '#1c1917',
    muted: '#78716c',
  },
  modern: {
    primary: '#a84372',
    page: '#fdf2f8',
    header: '#a84372',
    headerText: '#ffffff',
    card: '#ffffff',
    text: '#1c1917',
    muted: '#78716c',
  },
  minimal: {
    primary: '#171717',
    page: '#ffffff',
    header: '#ffffff',
    headerText: '#171717',
    card: '#ffffff',
    text: '#171717',
    muted: '#737373',
  },
};

export const THEME_PALETTE_FIELDS: {
  key: keyof ThemeColorPalette;
  label: string;
  hint: string;
}[] = [
  { key: 'primary', label: 'Primary', hint: 'Buttons, selected times, and highlights' },
  { key: 'page', label: 'Page background', hint: 'Area behind the booking card' },
  { key: 'header', label: 'Header background', hint: 'Bar behind your business name' },
  { key: 'headerText', label: 'Header text', hint: 'Business name and subtitle' },
  { key: 'card', label: 'Card background', hint: 'Main booking panel' },
  { key: 'text', label: 'Body text', hint: 'Titles and labels' },
  { key: 'muted', label: 'Secondary text', hint: 'Hints and descriptions' },
];

export function normalizeBookingBranding(raw?: BookingBranding | null): BookingBranding {
  if (!raw) return {};

  const themePalettes = { ...raw.themePalettes };
  const legacy = (raw as BookingBranding & { colors?: Partial<Record<SiteTemplate, string>> }).colors;
  if (legacy) {
    for (const [template, primary] of Object.entries(legacy) as [SiteTemplate, string][]) {
      if (!primary) continue;
      themePalettes[template] = {
        ...themePalettes[template],
        primary,
        ...(template === 'modern' ? { header: primary } : {}),
      };
    }
  }

  return {
    themePalettes: Object.keys(themePalettes).length > 0 ? themePalettes : undefined,
    backgroundImageUrl: raw.backgroundImageUrl,
    uiOpacity: raw.uiOpacity,
    logoUrl: raw.logoUrl,
    faviconUrl: raw.faviconUrl,
  };
}

export function resolveThemePalette(
  template: SiteTemplate | null | undefined,
  branding?: BookingBranding | null,
): Required<ThemeColorPalette> {
  const t = template ?? 'classic';
  const defaults = DEFAULT_THEME_PALETTES[t];
  const custom = branding?.themePalettes?.[t] ?? {};
  return {
    primary: custom.primary ?? defaults.primary!,
    page: custom.page ?? defaults.page!,
    header: custom.header ?? defaults.header!,
    headerText: custom.headerText ?? defaults.headerText!,
    card: custom.card ?? defaults.card!,
    text: custom.text ?? defaults.text!,
    muted: custom.muted ?? defaults.muted!,
  };
}

export function resolveUiOpacity(branding?: BookingBranding | null): number {
  return branding?.uiOpacity ?? DEFAULT_UI_OPACITY;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  const value = match[1]!;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function bookingStyleVars(
  template: SiteTemplate | null | undefined,
  branding?: BookingBranding | null,
): CSSProperties {
  const palette = resolveThemePalette(template, branding);
  const cardOpacity = resolveUiOpacity(branding);

  return {
    ['--booking-primary' as string]: palette.primary,
    ['--booking-page' as string]: palette.page,
    ['--booking-header' as string]: palette.header,
    ['--booking-header-text' as string]: palette.headerText,
    ['--booking-card' as string]: hexToRgba(palette.card, cardOpacity),
    ['--booking-text' as string]: palette.text,
    ['--booking-muted' as string]: palette.muted,
    ['--booking-card-opacity' as string]: String(cardOpacity),
  };
}

export async function readFileAsBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export const BOOKING_IMAGE_ACCEPT =
  'image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/x-icon,image/vnd.microsoft.icon';
