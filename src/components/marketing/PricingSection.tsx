import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { getStartedPath } from '@/lib/signup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  PLAN_FEATURES,
  PLAN_TIERS,
  priceMonthlyDollars,
  tierIncludesFeature,
  type PlanTierMarketing,
} from '@/lib/plan-features';

function TierCard({ tier }: { tier: PlanTierMarketing }) {
  return (
    <Card
      className={cn(
        'relative flex flex-col border-white/15 bg-white/10 text-white shadow-none backdrop-blur-sm',
        tier.highlighted && 'border-bc-magenta/60 ring-1 ring-bc-magenta/40',
      )}
    >
      {tier.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-bc-magenta px-3 py-1 text-xs font-medium text-white">
            Most popular
          </span>
        </div>
      )}
      <CardHeader className="pb-4">
        <CardTitle className="text-xl text-white">{tier.name}</CardTitle>
        <CardDescription className="text-white/65">{tier.tagline}</CardDescription>
        <div className="pt-2">
          <span className="text-3xl font-bold text-white">${priceMonthlyDollars(tier)}</span>
          <span className="text-sm text-white/55">/month</span>
        </div>
        <p className="text-sm font-medium text-brand-200">{tier.staffLimitLabel}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <ul className="space-y-2 text-sm text-white/85">
          {PLAN_FEATURES.map((feature) => {
            const included = tierIncludesFeature(tier.id, feature.id);
            return (
              <li
                key={feature.id}
                className={cn('flex gap-2', !included && 'text-white/35')}
                title={feature.description}
              >
                {included ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#fdeb83]" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{feature.name}</span>
              </li>
            );
          })}
        </ul>
        <Button
          asChild
          className={cn(
            'mt-auto w-full',
            !tier.highlighted &&
              'border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white',
          )}
          variant={tier.highlighted ? 'default' : 'outline'}
        >
          <Link to={getStartedPath({ plan: tier.id })}>Get started</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-white/5 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Scheduling plans
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Pick the features your team needs. Every plan includes scheduling plus a free online booking
            page — see{' '}
            <a href="#websites" className="font-medium text-[#fdeb83] hover:underline">
              booking page options
            </a>{' '}
            above.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLAN_TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-white/55">
          Not sure which plan fits?{' '}
          <Link to="/contact" className="font-medium text-[#fdeb83] hover:underline">
            Contact us
          </Link>{' '}
          and we&apos;ll walk you through it.
        </p>
      </div>
    </section>
  );
}
