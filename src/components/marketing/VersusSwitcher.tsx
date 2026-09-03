import { Link } from 'react-router-dom';
import { VERSUS_PAGES, type VersusSlug } from '@/content/marketing-landing';
import { cn } from '@/lib/utils';

export function VersusSwitcher({ current }: { current: VersusSlug }) {
  return (
    <nav aria-label="Compare Viselle" className="flex flex-wrap gap-2">
      {(Object.keys(VERSUS_PAGES) as VersusSlug[]).map((slug) => {
        const active = slug === current;
        return (
          <Link
            key={slug}
            to={`/versus/${slug}`}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'border-[#fdeb83]/70 bg-[#fdeb83]/15 text-[#fdeb83]'
                : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white',
            )}
            aria-current={active ? 'page' : undefined}
          >
            vs {VERSUS_PAGES[slug].competitor}
          </Link>
        );
      })}
    </nav>
  );
}
