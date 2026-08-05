import { useEffect, type ReactElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/components/seo/PageSeo';
import { marketingSeo } from '@/content/marketing-seo';
import docsMarkdown from '@/content/public-booking-api.md?raw';
import { MARKETING_SHELL_CLASS } from '@/lib/marketing-theme';

function plainText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(plainText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return plainText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return '';
}

/** Stable URL slug for heading anchors (matches GitHub-style kebab case). */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export type DocSectionLink = {
  id: string;
  label: string;
  /** 2 = major `##` section; 3 = endpoint `###` under Endpoints */
  level: 2 | 3;
};

const MAX_QUICK_LINKS = 20;

/**
 * Quick-link targets: every `##`, plus `###` under Endpoints.
 * Caps at MAX_QUICK_LINKS (drops deepest endpoint links first if over).
 */
export function extractDocSections(markdown: string): DocSectionLink[] {
  const sections: DocSectionLink[] = [];
  const seen = new Set<string>();
  let underEndpoints = false;

  const push = (label: string, level: 2 | 3) => {
    let id = slugifyHeading(label);
    if (!id) return;
    if (seen.has(id)) {
      let n = 2;
      while (seen.has(`${id}-${n}`)) n += 1;
      id = `${id}-${n}`;
    }
    seen.add(id);
    sections.push({ id, label, level });
  };

  for (const line of markdown.split(/\r?\n/)) {
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) {
      const label = h2[1].trim();
      underEndpoints = /^endpoints$/i.test(label);
      push(label, 2);
      continue;
    }
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3 && underEndpoints) {
      push(h3[1].trim(), 3);
    }
  }

  if (sections.length <= MAX_QUICK_LINKS) return sections;

  const h2Only = sections.filter((s) => s.level === 2);
  if (h2Only.length >= MAX_QUICK_LINKS) return h2Only.slice(0, MAX_QUICK_LINKS);

  const room = MAX_QUICK_LINKS - h2Only.length;
  const h3s = sections.filter((s) => s.level === 3).slice(0, room);
  const h3Ids = new Set(h3s.map((s) => s.id));
  return sections.filter((s) => s.level === 2 || h3Ids.has(s.id));
}

/**
 * Light-card prose only — no dark: variants. The marketing shell is dark and
 * often has html.dark, which would otherwise flip text to near-white on this card.
 */
const markdownComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">{children}</h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => {
    const id = slugifyHeading(plainText(children));
    return (
      <h2
        id={id || undefined}
        className="mt-10 scroll-mt-28 border-b border-stone-200 pb-2 text-xl font-semibold text-stone-900 first:mt-0"
      >
        {children}
      </h2>
    );
  },
  h3: ({ children }: { children?: ReactNode }) => {
    const id = slugifyHeading(plainText(children));
    return (
      <h3
        id={id || undefined}
        className="mt-8 scroll-mt-28 text-lg font-semibold text-stone-800"
      >
        {children}
      </h3>
    );
  },
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
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="mt-4 border-l-4 border-brand-400 bg-brand-50/70 px-4 py-3 text-[15px] leading-7 text-stone-700">
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
      <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[13px] text-brand-800">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="mt-4 overflow-x-auto rounded-xl bg-stone-900 p-4 text-stone-100">{children}</pre>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm text-stone-700">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className="bg-stone-100">{children}</thead>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border border-stone-200 px-3 py-2 font-semibold text-stone-800">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border border-stone-200 px-3 py-2 align-top text-stone-700">{children}</td>
  ),
  hr: () => <hr className="my-8 border-stone-200" />,
};

const docSections = extractDocSections(docsMarkdown);

function DocsQuickLinks({ sections }: { sections: DocSectionLink[] }) {
  if (sections.length === 0) return null;

  return (
    <nav aria-label="Quick links" className="mb-8 border-b border-stone-200 pb-6">
      <p className="text-sm font-semibold text-stone-900">Quick links</p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-stone-400">
        {sections.map((section) => (
          <li
            key={section.id}
            className={section.level === 3 ? 'ml-4 marker:text-stone-300' : undefined}
          >
            <a
              href={`#${section.id}`}
              className="text-[15px] font-medium text-brand-800 underline-offset-2 hover:text-brand-900 hover:underline"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PublicApiDocsPage() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'smooth';
    return () => {
      root.style.scrollBehavior = previous;
    };
  }, []);

  return (
    <div className={MARKETING_SHELL_CLASS}>
      <PageSeo {...marketingSeo.docsApi} />
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-white/60">
          <Link to="/" className="hover:text-white">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>Developer docs</span>
        </p>
        <article className="mt-6 rounded-2xl border border-white/15 bg-white p-8 text-stone-900 shadow-2xl sm:p-10">
          <DocsQuickLinks sections={docSections} />
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {docsMarkdown}
          </ReactMarkdown>
        </article>
        <p className="mt-12 text-sm text-white/60">
          Need an API key? Sign in to Viselle and open{' '}
          <span className="font-medium text-white/80">Settings → Booking website</span>.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
