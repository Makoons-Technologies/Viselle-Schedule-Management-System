import { Link } from 'react-router-dom';
import { MarketingPageFrame } from '@/components/marketing/MarketingPageFrame';
import { marketingSeo } from '@/content/marketing-seo';

const LINKS = [
  {
    to: '/docs/api',
    title: 'Public booking API',
    body: 'Look up organizations, services, and availability, and create appointments without authentication.',
  },
  {
    href: '/llms.txt',
    title: 'llms.txt',
    body: 'A short machine-readable summary of what Viselle is, who it is for, and the public URLs.',
  },
  {
    to: '/releases',
    title: 'Release notes',
    body: 'What shipped — scheduling, booking pages, reminders, and related product updates.',
  },
  {
    to: '/blog',
    title: 'Resources',
    body: 'Switcher pages and other site content. No social auto-posts.',
  },
];

export function DocsHubPage() {
  return (
    <MarketingPageFrame seo={marketingSeo.docs} crumbs={[{ label: 'Home', to: '/' }, { label: 'Docs' }]}>
      <article className="mt-6 rounded-2xl border border-white/15 bg-white p-8 text-stone-900 shadow-2xl sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Docs</h1>
        <p className="mt-3 text-[15px] leading-7 text-stone-700">
          Public documentation for Viselle. There is no separate help center yet — start here, or{' '}
          <Link to="/contact" className="font-medium text-brand-700 underline-offset-2 hover:underline">
            contact us
          </Link>
          .
        </p>
        <ul className="mt-8 space-y-4">
          {LINKS.map((item) => (
            <li key={item.title} className="rounded-xl border border-stone-200 px-4 py-4">
              {item.to ? (
                <Link to={item.to} className="font-semibold text-brand-800 hover:underline">
                  {item.title}
                </Link>
              ) : (
                <a href={item.href} className="font-semibold text-brand-800 hover:underline">
                  {item.title}
                </a>
              )}
              <p className="mt-1 text-sm leading-6 text-stone-600">{item.body}</p>
            </li>
          ))}
        </ul>
      </article>
    </MarketingPageFrame>
  );
}
