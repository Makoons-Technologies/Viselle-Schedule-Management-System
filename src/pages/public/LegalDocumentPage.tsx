import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/components/seo/PageSeo';
import type { MarketingSeoConfig } from '@/content/marketing-seo';
import { MARKETING_SHELL_CLASS } from '@/lib/marketing-theme';

/**
 * Light-card prose only — no dark: variants. Matches ReleasesPage so legal
 * copy stays readable on the dark marketing shell.
 */
const markdownComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">{children}</h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-10 border-b border-stone-200 pb-2 text-xl font-semibold text-stone-900">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-8 text-lg font-semibold text-stone-800">{children}</h3>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mt-4 text-[15px] leading-7 text-stone-700">{children}</p>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      className="font-medium text-brand-700 underline-offset-2 hover:text-brand-800 hover:underline"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-[15px] leading-7 text-stone-700 marker:text-stone-400">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6 text-[15px] leading-7 text-stone-700 marker:text-stone-500">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => <li className="pl-1 text-stone-700">{children}</li>,
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-stone-900">{children}</strong>
  ),
  hr: () => <hr className="my-8 border-stone-200" />,
};

interface LegalDocumentPageProps {
  seo: MarketingSeoConfig;
  crumb: string;
  markdown: string;
}

export function LegalDocumentPage({ seo, crumb, markdown }: LegalDocumentPageProps) {
  return (
    <div className={MARKETING_SHELL_CLASS}>
      <PageSeo {...seo} />
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-white/60">
          <Link to="/" className="hover:text-white">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>{crumb}</span>
        </p>
        <article className="mt-6 rounded-2xl border border-white/15 bg-white p-8 text-stone-900 shadow-2xl sm:p-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {markdown}
          </ReactMarkdown>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
