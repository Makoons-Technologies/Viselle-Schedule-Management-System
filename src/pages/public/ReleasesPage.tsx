import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/components/seo/PageSeo';
import { marketingSeo } from '@/content/marketing-seo';
import releasesMarkdown from '@/content/releases.md?raw';
import { MARKETING_SHELL_CLASS } from '@/lib/marketing-theme';

const markdownComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-10 border-b border-stone-200 pb-2 text-xl font-semibold text-stone-900 dark:border-stone-700 dark:text-stone-50">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-8 text-lg font-semibold text-stone-900 dark:text-stone-50">{children}</h3>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mt-4 text-[15px] leading-7 text-stone-700 dark:text-stone-300">{children}</p>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-[15px] leading-7 text-stone-700 dark:text-stone-300">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6 text-[15px] leading-7 text-stone-700 dark:text-stone-300">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => <li className="pl-1">{children}</li>,
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-stone-900 dark:text-stone-100">{children}</strong>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="mt-4 border-l-4 border-brand-300 bg-brand-50/60 px-4 py-3 text-[15px] leading-7 text-stone-700 dark:border-brand-700 dark:bg-brand-950/30 dark:text-stone-300">
      {children}
    </blockquote>
  ),
  code: ({ className, children }: { className?: string; children?: ReactNode }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className="block overflow-x-auto whitespace-pre font-mono text-[13px] leading-6 text-stone-100">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[13px] text-brand-800 dark:bg-stone-800 dark:text-brand-200">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="mt-4 overflow-x-auto rounded-xl bg-stone-900 p-4 text-stone-100 dark:bg-stone-950">
      {children}
    </pre>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className="bg-stone-100 dark:bg-stone-800/80">{children}</thead>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border border-stone-200 px-3 py-2 font-semibold text-stone-800 dark:border-stone-700 dark:text-stone-100">
      {children}
    </th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border border-stone-200 px-3 py-2 align-top text-stone-700 dark:border-stone-700 dark:text-stone-300">
      {children}
    </td>
  ),
  hr: () => <hr className="my-8 border-stone-200 dark:border-stone-700" />,
};

export function ReleasesPage() {
  return (
    <div className={MARKETING_SHELL_CLASS}>
      <PageSeo {...marketingSeo.releases} />
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-white/60">
          <Link to="/" className="hover:text-white">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>Release notes</span>
        </p>
        <article className="mt-6 rounded-2xl border border-white/15 bg-white/95 p-6 shadow-2xl sm:p-8">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {releasesMarkdown}
          </ReactMarkdown>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
