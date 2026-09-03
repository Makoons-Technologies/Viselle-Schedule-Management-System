import { Link } from 'react-router-dom';
import { MarketingPageFrame } from '@/components/marketing/MarketingPageFrame';
import { BLOG_POSTS } from '@/content/marketing-landing';
import { marketingSeo } from '@/content/marketing-seo';

export function BlogIndexPage() {
  return (
    <MarketingPageFrame seo={marketingSeo.blog} crumbs={[{ label: 'Home', to: '/' }, { label: 'Resources' }]}>
      <article className="mt-6 rounded-2xl border border-white/15 bg-white p-8 text-stone-900 shadow-2xl sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Resources</h1>
        <p className="mt-3 text-[15px] leading-7 text-stone-700">
          Site pages for salon owners comparing Viselle with other booking tools. Honest switchers — not
          ads, and nothing auto-posted to social.
        </p>
        <ul className="mt-8 space-y-5">
          {BLOG_POSTS.map((post) => (
            <li key={post.slug} className="border-t border-stone-200 pt-5 first:border-t-0 first:pt-0">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{post.dateLabel}</p>
              <h2 className="mt-1 text-xl font-semibold">
                <Link to={post.path} className="text-stone-900 hover:text-brand-800 hover:underline">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{post.description}</p>
            </li>
          ))}
        </ul>
      </article>
    </MarketingPageFrame>
  );
}
