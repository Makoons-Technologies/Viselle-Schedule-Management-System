import { useEffect, useState } from 'react';
import { Calendar, Clock, MessageSquare, Sparkles, Users } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ViselleLogo } from '@/components/common/ViselleLogo';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { GetStartedStepsSection } from '@/components/marketing/GetStartedStepsSection';
import { IndustryStatsSection } from '@/components/marketing/IndustryStatsSection';
import { MarketingFaqSection } from '@/components/marketing/MarketingFaqSection';
import { OwnerStoriesSection } from '@/components/marketing/OwnerStoriesSection';
import { PricingSection } from '@/components/marketing/PricingSection';
import { WebsiteOptionsSection } from '@/components/marketing/WebsiteOptionsSection';
import { PageSeo } from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { marketingSeo } from '@/content/marketing-seo';
import { useAutoMotionPermission } from '@/hooks/useFoilTilt';
import { signedInHomePath } from '@/lib/auth-redirect';
import { MARKETING_SHELL_CLASS } from '@/lib/marketing-theme';
import { DEFAULT_TRIAL_DAYS, trialStartPath } from '@/content/marketing-landing';
import { fetchLiveHomepageTrial, getStartedPath } from '@/lib/signup';
import type { TrialCampaign } from '@/types/api';

/** Solid shell while a stored session is restored. Never the marketing hero (BEA-79). */
function SessionCheckShell() {
  return (
    <div
      className="min-h-dvh bg-stone-50 dark:bg-stone-900"
      data-testid="session-check-shell"
      aria-busy="true"
      aria-label="Loading your workspace"
    />
  );
}

const INDUSTRY_FEATURES = [
  {
    icon: Calendar,
    title: 'Clients book while you work',
    description:
      'No more phone tag between appointments. Your booking page shows real availability — clients pick a time that works.',
  },
  {
    icon: MessageSquare,
    title: 'Fewer no-shows',
    description:
      'Automatic email reminders so clients remember their color, facial, or cut — without you chasing them down. Texts are a later Professional/Business option, not a live campaign tool.',
  },
  {
    icon: Users,
    title: 'Built for teams',
    description:
      'Each stylist, esthetician, or therapist gets their own schedule. Owners see the whole salon at a glance.',
  },
  {
    icon: Clock,
    title: 'Recurring clients, handled',
    description:
      'Weekly blowouts, monthly facials, standing color appointments — set it once and let the calendar fill itself.',
  },
];

export function LandingPage() {
  const { isAuthenticated, user, token } = useAuth();
  const [homepageTrial, setHomepageTrial] = useState<TrialCampaign | null>(null);
  const [hash, setHash] = useState(() =>
    typeof window !== 'undefined' ? window.location.hash : '',
  );

  // Pre-request motion on homepage so /business-card tilt is ready after first tap.
  useAutoMotionPermission(!token);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (hash) {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [hash]);

  useEffect(() => {
    if (token) return;
    fetchLiveHomepageTrial()
      .then((campaign) => setHomepageTrial(campaign))
      .catch(() => setHomepageTrial(null));
  }, [token]);

  // Token in storage means a session is likely. Do not paint Get started / Sign in
  // / the salon hero while /auth/me is in flight (BEA-79).
  if (token && !user) {
    return <SessionCheckShell />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={signedInHomePath(user)} replace />;
  }

  const seo =
    hash === '#pricing'
      ? marketingSeo.pricing
      : hash === '#websites'
        ? marketingSeo.websites
        : marketingSeo.home;

  return (
    <div className={MARKETING_SHELL_CLASS}>
      <PageSeo {...seo} />
      <MarketingHeader />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex flex-col items-center gap-4">
            <ViselleLogo size={144} className="size-28 sm:size-36" />
            <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Viselle
            </p>
          </div>
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white/90 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-[#fdeb83]" />
            For salons, spas &amp; beauty studios
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Scheduling that lets you focus on your clients
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-white/75">
            Viselle helps beauty and wellness businesses manage appointments, staff schedules, and
            client reminders — without spreadsheets or sticky notes. Run your chair, room, or booth
            with tools made for this industry.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to={trialStartPath}>
                <Sparkles className="h-4 w-4" />
                Start free trial
              </Link>
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
          <p className="mt-4 text-sm text-white/70">
            {homepageTrial?.durationDays ?? DEFAULT_TRIAL_DAYS}-day free trial
            {homepageTrial?.paymentMode === 'free_no_card' ? ' · no credit card required' : ''}.
            Prefer to pick a plan first?{' '}
            <Link to={getStartedPath()} className="font-medium text-[#fdeb83] hover:underline">
              Get started
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/5 py-16 backdrop-blur-[2px]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              What salon owners actually need
            </h2>
            <p className="mt-3 text-white/70">
              You didn&apos;t open a business to wrestle with software. Viselle keeps the busywork
              off your plate.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {INDUSTRY_FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bc-magenta/30 text-[#fdeb83] ring-1 ring-white/15">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GetStartedStepsSection />
      <IndustryStatsSection />
      <OwnerStoriesSection />
      <WebsiteOptionsSection />
      <PricingSection />
      <MarketingFaqSection />
      <MarketingFooter />
    </div>
  );
}
