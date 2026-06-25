import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { BookingBranding, SiteTemplate } from '@/types/api';
import { bookingStyleVars } from '@/lib/booking-branding';
import { cn } from '@/lib/utils';
import { bookingTheme } from './booking-theme';

interface BookingPublicShellProps {
  businessName?: string;
  subtitle?: string;
  siteTemplate?: SiteTemplate | null;
  branding?: BookingBranding | null;
  children: ReactNode;
  footer?: ReactNode;
  showPoweredBy?: boolean;
}

export function BookingPublicShell({
  businessName,
  subtitle,
  siteTemplate,
  branding,
  children,
  footer,
  showPoweredBy = true,
}: BookingPublicShellProps) {
  const theme = bookingTheme(siteTemplate, branding);
  const styleVars = bookingStyleVars(siteTemplate, branding);
  const backgroundImage = branding?.backgroundImageUrl ?? null;

  useEffect(() => {
    if (!branding?.faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    const previous = link?.href;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = branding.faviconUrl;
    return () => {
      if (link && previous) link.href = previous;
    };
  }, [branding?.faviconUrl]);

  return (
    <div
      className="relative flex min-h-screen flex-col text-[var(--booking-text)]"
      style={{ colorScheme: 'light', ...styleVars, ...(!backgroundImage ? theme.pageStyle : undefined) }}
    >
      {backgroundImage && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-black/25" aria-hidden />
        </>
      )}

      <div className="relative z-10 flex min-h-screen flex-col">
        {businessName && (
          <header className={theme.header} style={theme.headerStyle}>
            <div className="mx-auto flex max-w-md items-center gap-3">
              {branding?.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg border border-white/20 object-cover bg-white/90"
                />
              ) : null}
              <div className="min-w-0">
                <p className={cn(theme.headerTitle, 'truncate')}>{businessName}</p>
                {subtitle && <p className={theme.headerSubtitle}>{subtitle}</p>}
              </div>
            </div>
          </header>
        )}

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6 sm:py-8">
          <div className={cn('flex flex-1 flex-col p-5 sm:p-6', theme.card)} style={theme.cardStyle}>
            {children}
          </div>
        </main>

        {(footer || showPoweredBy) && (
          <footer className="px-4 pb-6 pt-2 text-center">
            {footer}
            {showPoweredBy && (
              <Link to="/" className="text-xs text-neutral-400 hover:text-neutral-600">
                Powered by Viselle
              </Link>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

export function BookingSectionLabel({
  children,
  siteTemplate,
  branding,
}: {
  children: ReactNode;
  siteTemplate?: SiteTemplate | null;
  branding?: BookingBranding | null;
}) {
  const theme = bookingTheme(siteTemplate, branding);
  return <p className={cn('mb-3', theme.label)}>{children}</p>;
}

export function BookingPageTitle({
  children,
  siteTemplate,
  branding,
}: {
  children: ReactNode;
  siteTemplate?: SiteTemplate | null;
  branding?: BookingBranding | null;
}) {
  const theme = bookingTheme(siteTemplate, branding);
  return <h1 className={cn('mb-6', theme.title)}>{children}</h1>;
}

export function BookingStickyAction({
  children,
  siteTemplate,
  branding,
  className,
}: {
  children: ReactNode;
  siteTemplate?: SiteTemplate | null;
  branding?: BookingBranding | null;
  className?: string;
}) {
  const theme = bookingTheme(siteTemplate, branding);
  return (
    <div
      className={cn(
        'sticky bottom-0 -mx-5 mt-auto px-5 pb-0 pt-4 sm:-mx-6 sm:px-6',
        theme.stickyAction,
        className,
      )}
      style={theme.stickyStyle}
    >
      {children}
    </div>
  );
}
