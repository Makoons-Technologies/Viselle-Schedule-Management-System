import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/components/seo/PageSeo';
import type { MarketingSeoConfig } from '@/content/marketing-seo';
import { MARKETING_SHELL_CLASS } from '@/lib/marketing-theme';

export function MarketingPageFrame({
  seo,
  crumbs,
  children,
  wide,
}: {
  seo: MarketingSeoConfig;
  crumbs: Array<{ label: string; to?: string }>;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={MARKETING_SHELL_CLASS}>
      <PageSeo {...seo} />
      <MarketingHeader />
      <main className={wide ? 'mx-auto max-w-6xl px-4 py-10 sm:px-6' : 'mx-auto max-w-3xl px-4 py-10 sm:px-6'}>
        <p className="text-sm text-white/60">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`}>
              {index > 0 && <span className="mx-2">/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-white">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </p>
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
