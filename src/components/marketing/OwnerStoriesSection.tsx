import { greeneCountyLine, shopCountQuote } from '@/lib/industry-stats';
import { OWNER_STORY_CARDS } from '@/content/marketing-landing';

export function OwnerStoriesSection() {
  return (
    <section
      id="owner-stories"
      aria-labelledby="owner-stories-heading"
      className="py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="owner-stories-heading" className="text-2xl font-bold text-white sm:text-3xl">
            Shops this size, in towns like Springfield
          </h2>
          <p className="mt-3 text-white/70">
            Composite sketches — no shop names, no invented testimonials.{' '}
            {shopCountQuote()} {greeneCountyLine()}
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {OWNER_STORY_CARDS.map((card) => (
            <figure
              key={card.setting}
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-6 backdrop-blur-sm"
            >
              <figcaption className="text-sm font-semibold text-[#fdeb83]">{card.setting}</figcaption>
              <blockquote className="mt-3 text-sm leading-relaxed text-white/80">{card.body}</blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
