import type { CSSProperties } from 'react';
import type { BookingBranding, SiteTemplate } from '@/types/api';
import { hexToRgba, resolveThemePalette, resolveUiOpacity } from '@/lib/booking-branding';
import { cn } from '@/lib/utils';

export interface BookingTheme {
  pageStyle: CSSProperties;
  header: string;
  headerStyle: CSSProperties;
  headerTitle: string;
  headerSubtitle: string;
  card: string;
  cardStyle: CSSProperties;
  title: string;
  label: string;
  chip: string;
  chipSelected: string;
  chipDisabled: string;
  chipShape: string;
  timeDisabled: string;
  timeAvailable: string;
  timeSelected: string;
  timeShape: string;
  choice: string;
  choiceSelected: string;
  choiceShape: string;
  primaryBtn: string;
  accent: string;
  stickyAction: string;
  stickyFooter: string;
  stickyFooterStyle: CSSProperties;
  input: string;
  backLink: string;
  mutedText: string;
}

export function bookingTheme(
  template: SiteTemplate | null | undefined,
  branding?: BookingBranding | null,
): BookingTheme {
  const t = template ?? 'classic';
  const palette = resolveThemePalette(template, branding);
  const cardOpacity = resolveUiOpacity(branding);
  const cardStyle: CSSProperties = {
    backgroundColor: hexToRgba(palette.card, cardOpacity),
  };
  const pageStyle: CSSProperties = { backgroundColor: palette.page };
  const headerStyle: CSSProperties = {
    backgroundColor: palette.header,
    color: palette.headerText,
  };
  const stickyFooterStyle: CSSProperties = {
    backgroundColor: palette.card,
  };

  const shared = {
    pageStyle,
    headerStyle,
    cardStyle,
    stickyFooterStyle,
    title: 'font-bold text-[var(--booking-text)]',
    label: 'font-semibold uppercase tracking-wider text-[var(--booking-muted)]',
    chipSelected:
      'border-2 border-[var(--booking-primary)] bg-[var(--booking-primary)] text-white',
    chipDisabled:
      'border border-stone-200 bg-stone-100 text-[var(--booking-muted)] cursor-not-allowed disabled:opacity-100',
    timeDisabled:
      'border border-stone-200 bg-stone-100 text-[var(--booking-muted)] line-through cursor-not-allowed disabled:opacity-100',
    timeSelected:
      'border-2 border-[var(--booking-primary)] bg-[var(--booking-primary)] text-white',
    choiceSelected: 'border-2 border-[var(--booking-primary)]',
    primaryBtn: 'bg-[var(--booking-primary)] text-white hover:opacity-90',
    accent: 'text-[var(--booking-primary)]',
    backLink: 'text-[var(--booking-muted)] hover:text-[var(--booking-text)]',
    mutedText: 'text-[var(--booking-muted)]',
    input:
      'border bg-white text-[var(--booking-text)] focus:border-[var(--booking-primary)] focus:ring-1 focus:ring-[var(--booking-primary)]',
  };

  if (t === 'minimal') {
    return {
      ...shared,
      header: 'border-b px-4 py-4',
      headerTitle: 'text-base font-medium tracking-tight',
      headerSubtitle: 'text-xs opacity-70',
      card: 'border shadow-none rounded-lg backdrop-blur-sm',
      chipShape: 'rounded-md',
      chip: 'border border-[color-mix(in_srgb,var(--booking-text)_25%,white)] bg-white text-[var(--booking-text)]',
      timeShape: 'rounded-md px-3 py-2.5 text-sm',
      timeAvailable:
        'border border-[color-mix(in_srgb,var(--booking-text)_25%,white)] bg-white text-[var(--booking-text)] hover:border-[var(--booking-primary)]',
      choiceShape: 'rounded-md',
      choice:
        'border border-[color-mix(in_srgb,var(--booking-text)_25%,white)] bg-white hover:border-[var(--booking-primary)]',
      stickyAction: 'border-t backdrop-blur-sm',
      stickyFooter: 'rounded-b-lg backdrop-blur-sm',
    };
  }

  if (t === 'modern') {
    return {
      ...shared,
      header: 'px-4 py-5 shadow-md',
      headerTitle: 'text-lg font-bold tracking-tight',
      headerSubtitle: 'text-sm opacity-80',
      card: 'border-0 shadow-xl shadow-black/10 backdrop-blur-md rounded-3xl',
      title: 'text-2xl font-bold tracking-tight text-[var(--booking-text)]',
      label: 'text-xs font-bold uppercase tracking-wider text-[var(--booking-primary)]',
      chipShape: 'rounded-2xl',
      chip: 'border border-stone-200 bg-white text-[var(--booking-text)] shadow-sm',
      timeShape: 'rounded-xl px-3 py-3 text-sm font-semibold',
      timeAvailable:
        'border border-stone-200 bg-white text-[var(--booking-text)] hover:border-[var(--booking-primary)]',
      choiceShape: 'rounded-2xl',
      choice: 'border border-stone-200 bg-white shadow-sm hover:border-[var(--booking-primary)] hover:shadow',
      stickyAction: 'border-t border-[color-mix(in_srgb,var(--booking-primary)_15%,white)] backdrop-blur-sm',
      stickyFooter: 'rounded-b-3xl backdrop-blur-md',
      input:
        'rounded-xl border border-stone-200 bg-white text-[var(--booking-text)] focus:border-[var(--booking-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--booking-primary)_15%,white)]',
      backLink: 'text-[var(--booking-primary)] hover:opacity-80',
    };
  }

  return {
    ...shared,
    header: 'border-b px-4 py-3',
    headerTitle: 'font-semibold',
    headerSubtitle: 'text-xs opacity-70',
    card: 'border border-stone-200/80 shadow-sm rounded-2xl backdrop-blur-sm',
    title: 'text-2xl font-bold text-[var(--booking-text)]',
    chipShape: 'rounded-full',
    chip: 'border border-stone-200 bg-white text-[var(--booking-text)]',
    chipSelected:
      'border-2 border-[var(--booking-primary)] bg-[color-mix(in_srgb,var(--booking-primary)_12%,white)] text-[var(--booking-primary)]',
    timeShape: 'rounded-full px-3 py-3 text-sm font-medium',
    timeAvailable: 'border border-stone-200 bg-white text-[var(--booking-text)] hover:border-[var(--booking-primary)]',
    timeSelected:
      'border-2 border-[var(--booking-primary)] bg-[color-mix(in_srgb,var(--booking-primary)_12%,white)] text-[var(--booking-primary)]',
    choiceShape: 'rounded-xl',
    choice: 'border border-stone-200 bg-white hover:border-[var(--booking-primary)]',
    stickyAction: 'border-t border-stone-100 backdrop-blur-sm',
    stickyFooter: 'rounded-b-2xl backdrop-blur-sm',
    input:
      'rounded-xl border border-stone-200 bg-white text-[var(--booking-text)] focus:border-[var(--booking-primary)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--booking-primary)_20%,white)]',
  };
}

export function bookingChipClass(selected: boolean, disabled: boolean, theme: BookingTheme) {
  return cn(
    'flex min-w-[3.25rem] shrink-0 flex-col items-center justify-center border px-3 py-2.5 text-center transition-colors',
    theme.chipShape,
    disabled && theme.chipDisabled,
    disabled && 'relative overflow-hidden',
    !disabled && !selected && theme.chip,
    !disabled && selected && theme.chipSelected,
    !disabled && 'cursor-pointer',
  );
}

export function bookingTimeClass(selected: boolean, disabled: boolean, theme: BookingTheme) {
  return cn(
    'border font-medium transition-colors',
    theme.timeShape,
    disabled && theme.timeDisabled,
    !disabled && !selected && theme.timeAvailable,
    !disabled && selected && theme.timeSelected,
    !disabled && 'cursor-pointer',
  );
}

export function bookingChoiceClass(selected: boolean, theme: BookingTheme) {
  return cn(
    'w-full border px-4 py-4 text-left transition-colors text-[var(--booking-text)]',
    theme.choiceShape,
    selected ? theme.choiceSelected : theme.choice,
  );
}
