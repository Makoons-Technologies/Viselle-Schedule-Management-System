import { Link, Navigate, useParams } from 'react-router-dom';
import { MarketingPageFrame } from '@/components/marketing/MarketingPageFrame';
import { VersusSwitcher } from '@/components/marketing/VersusSwitcher';
import { Button } from '@/components/ui/button';
import { VERSUS_PAGES, trialStartPath, type VersusSlug } from '@/content/marketing-landing';
import { marketingSeo } from '@/content/marketing-seo';

function isVersusSlug(value: string | undefined): value is VersusSlug {
  return value === 'glossgenius' || value === 'square';
}

export function VersusPage() {
  const { slug } = useParams<{ slug: string }>();
  if (!isVersusSlug(slug)) {
    return <Navigate to="/blog" replace />;
  }

  const page = VERSUS_PAGES[slug];
  const seo = slug === 'glossgenius' ? marketingSeo.versusGlossgenius : marketingSeo.versusSquare;

  return (
    <MarketingPageFrame
      seo={seo}
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Resources', to: '/blog' },
        { label: page.title },
      ]}
    >
      <article className="mt-6 rounded-2xl border border-white/15 bg-white p-8 text-stone-900 shadow-2xl sm:p-10">
        <VersusSwitcher current={slug} />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-stone-900">{page.title}</h1>
        <p className="mt-3 text-[15px] leading-7 text-stone-700">{page.lede}</p>

        <h2 className="mt-10 border-b border-stone-200 pb-2 text-xl font-semibold text-stone-900">
          Choose Viselle if
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-[15px] leading-7 text-stone-700">
          {page.chooseViselle.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2 className="mt-10 border-b border-stone-200 pb-2 text-xl font-semibold text-stone-900">
          Choose {page.competitor} if
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-[15px] leading-7 text-stone-700">
          {page.chooseThem.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2 className="mt-10 border-b border-stone-200 pb-2 text-xl font-semibold text-stone-900">
          Where they overlap
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-[15px] leading-7 text-stone-700">
          {page.overlap.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2 className="mt-10 border-b border-stone-200 pb-2 text-xl font-semibold text-stone-900">
          Stay honest
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-[15px] leading-7 text-stone-700">
          {page.notes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link to={trialStartPath}>Start free trial</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/request-demo">Request a demo</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/pricing">See Viselle plans</Link>
          </Button>
        </div>
      </article>
    </MarketingPageFrame>
  );
}
