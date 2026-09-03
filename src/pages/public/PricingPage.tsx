import { Link } from 'react-router-dom';
import { MarketingPageFrame } from '@/components/marketing/MarketingPageFrame';
import { PricingSection } from '@/components/marketing/PricingSection';
import { Button } from '@/components/ui/button';
import { marketingSeo } from '@/content/marketing-seo';
import { DEFAULT_TRIAL_DAYS, trialStartPath } from '@/content/marketing-landing';

export function PricingPage() {
  return (
    <MarketingPageFrame
      seo={marketingSeo.pricingPage}
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Pricing' }]}
      wide
    >
      <div className="mt-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Plans &amp; pricing</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-white/70">
          Same three plans as the homepage. {DEFAULT_TRIAL_DAYS}-day free trial on the live homepage
          offer. No invented add-on prices — booking page is included.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to={trialStartPath}>Start free trial</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"
          >
            <Link to="/request-demo">Request a demo</Link>
          </Button>
        </div>
      </div>
      <div className="mt-4">
        <PricingSection />
      </div>
    </MarketingPageFrame>
  );
}
