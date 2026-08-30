import { useEffect, useRef, useState } from 'react';
import {
  BLS_QCEW_HOME,
  formatCount,
  formatEmployeesPerShop,
  formatFredJobs,
  greeneCountyLine,
  industryStats,
  shopCountQuote,
  sourceCitation,
} from '@/lib/industry-stats';

const SPLIT = [
  { key: 'beauty', label: 'Beauty salons', slice: industryStats.beautySalons },
  { key: 'nail', label: 'Nail salons', slice: industryStats.nailSalons },
  { key: 'barber', label: 'Barber shops', slice: industryStats.barberShops },
] as const;

const COUNT_UP_MS = 1200;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function useCountUp(target: number, active: boolean): number {
  const [value, setValue] = useState(0);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (reducedMotion.current || target <= 0) {
      setValue(target);
      return;
    }

    let frame = 0;
    const started = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / COUNT_UP_MS);
      setValue(Math.round(target * easeOutCubic(progress)));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);

  return value;
}

function StatCount({ value, active }: { value: number; active: boolean }) {
  const display = useCountUp(value, active);
  return (
    <p className="text-3xl font-bold tabular-nums tracking-tight text-[#fdeb83] sm:text-4xl">
      {formatCount(display)}
    </p>
  );
}

export function IndustryStatsSection() {
  const fredLine = formatFredJobs(industryStats);
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="industry"
      aria-labelledby="industry-stats-heading"
      className="py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="industry-stats-heading"
            className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
          >
            The shops Viselle is built for.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/80">{shopCountQuote(industryStats)}</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {SPLIT.map(({ key, label, slice }) => (
            <div
              key={key}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-6 text-center"
            >
              <StatCount value={slice.establishments} active={visible} />
              <p className="mt-2 font-semibold text-white">{label}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-2xl space-y-3 text-center text-white/75">
          <p>
            {formatEmployeesPerShop(industryStats)} payroll employees per shop, on average.
          </p>
          <p>{greeneCountyLine(industryStats)}</p>
          {fredLine ? <p className="text-sm text-white/60">{fredLine}</p> : null}
          <p className="text-sm text-white/55">
            {sourceCitation(industryStats)}{' '}
            <a
              href={BLS_QCEW_HOME}
              className="text-[#fdeb83] underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              bls.gov/cew
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
