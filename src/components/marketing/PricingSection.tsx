import { Link } from 'react-router-dom';
import { Check, Minus } from 'lucide-react';
import { getStartedPath } from '@/lib/signup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PRICING_TIERS, type PricingTier } from '@/lib/pricing';

function TierCard({ tier }: { tier: PricingTier }) {
  return (
    <Card
      className={cn(
        'relative flex flex-col border-stone-200 dark:border-stone-700',
        tier.highlighted && 'border-brand-400 shadow-md ring-1 ring-brand-100 dark:ring-brand-800',
      )}
    >
      {tier.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white">
            Most popular
          </span>
        </div>
      )}
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        <CardDescription>{tier.tagline}</CardDescription>
        <div className="pt-2">
          <span className="text-3xl font-bold text-stone-900 dark:text-stone-100">${tier.priceMonthly}</span>
          <span className="text-sm text-stone-500 dark:text-stone-400">/month</span>
        </div>
        <p className="text-sm font-medium text-brand-700 dark:text-brand-300">{tier.staffLimit}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <ul className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
          {tier.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
              <span>{feature}</span>
            </li>
          ))}
          {tier.notIncluded?.map((item) => (
            <li key={item} className="flex gap-2 text-stone-400 dark:text-stone-500">
              <Minus className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Button asChild className="mt-auto w-full" variant={tier.highlighted ? 'default' : 'outline'}>
          <Link to={getStartedPath({ plan: tier.id })}>Get started</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-white py-16 dark:bg-stone-950 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
            Scheduling plans
          </h2>
          <p className="mt-4 text-lg text-stone-600 dark:text-stone-300">
            Pick the features your team needs. Every plan includes scheduling plus a free online booking
            page — see{' '}
            <a href="#websites" className="font-medium text-brand-700 hover:underline dark:text-brand-300">
              booking page options
            </a>{' '}
            above.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-stone-500 dark:text-stone-400">
          Not sure which plan fits?{' '}
          <Link to="/contact" className="font-medium text-brand-700 hover:underline dark:text-brand-300">
            Contact us
          </Link>{' '}
          and we&apos;ll walk you through it.
        </p>
      </div>
    </section>
  );
}
