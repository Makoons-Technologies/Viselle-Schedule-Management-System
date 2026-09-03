import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BEAUTY_VERTICALS,
  MARKETING_FAQ,
  type BeautyVertical,
} from '@/content/marketing-landing';
import { cn } from '@/lib/utils';

export function MarketingFaqSection() {
  const [vertical, setVertical] = useState<BeautyVertical>('salon');
  const pitch = BEAUTY_VERTICALS.find((item) => item.id === vertical)?.pitch;

  return (
    <section id="faq" aria-labelledby="faq-heading" className="border-y border-white/10 bg-white/5 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <h2 id="faq-heading" className="text-2xl font-bold text-white sm:text-3xl">
            Questions owners actually ask
          </h2>
          <p className="mt-3 text-white/70">
            Short answers first. Same facts as{' '}
            <Link to="/pricing" className="font-medium text-[#fdeb83] hover:underline">
              pricing
            </Link>
            , get started, and the booking-page checklist.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Shop type">
          {BEAUTY_VERTICALS.map((item) => {
            const selected = item.id === vertical;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setVertical(item.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  selected
                    ? 'border-[#fdeb83]/70 bg-[#fdeb83]/15 text-[#fdeb83]'
                    : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        {pitch && <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-white/75">{pitch}</p>}

        <div className="mt-10 divide-y divide-white/10 rounded-2xl border border-white/15 bg-white/10 px-5 backdrop-blur-sm">
          {MARKETING_FAQ.map((item) => (
            <details key={item.question} className="group py-4 first:pt-5 last:pb-5">
              <summary className="cursor-pointer list-none text-base font-semibold text-white marker:content-none">
                {item.question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
