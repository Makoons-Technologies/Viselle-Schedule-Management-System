import { useEffect, useState } from 'react';
import { Calendar, Clock, MessageSquare, Sparkles, Users } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ViselleLogo } from '@/components/common/ViselleLogo';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { PricingSection } from '@/components/marketing/PricingSection';
import { WebsiteOptionsSection } from '@/components/marketing/WebsiteOptionsSection';
import { PageSeo } from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { marketingSeo } from '@/content/marketing-seo';
import { fetchLiveHomepageTrial, getStartedPath } from '@/lib/signup';
import type { TrialCampaign } from '@/types/api';

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
      'Automatic email and text reminders so clients remember their color, facial, or cut — without you chasing them down.',
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
  const { isAuthenticated, isLoading, user } = useAuth();
  const [homepageTrial, setHomepageTrial] = useState<TrialCampaign | null>(null);
  const [hash, setHash] = useState(() =>
    typeof window !== 'undefined' ? window.location.hash : '',
  );

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
    fetchLiveHomepageTrial()
      .then((campaign) => setHomepageTrial(campaign))
      .catch(() => setHomepageTrial(null));
  }, []);

  if (!isLoading && isAuthenticated && user) {
    if (user.role === 'platform_owner') return <Navigate to="/platform/dashboard" replace />;
    if (user.role === 'org_owner') return <Navigate to={`/orgs/${user.organizationId}/dashboard`} replace />;
    return <Navigate to={`/orgs/${user.organizationId}/calendar`} replace />;
  }

  const seo =
    hash === '#pricing'
      ? marketingSeo.pricing
      : hash === '#websites'
        ? marketingSeo.websites
        : marketingSeo.home;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-stone-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <PageSeo {...seo} />
      <MarketingHeader />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex flex-col items-center gap-4">
            <ViselleLogo size={144} className="size-28 sm:size-36" />
            <p className="text-3xl font-semibold tracking-tight text-brand-700 dark:text-stone-100 sm:text-4xl">
              Viselle
            </p>
          </div>
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-900/60 dark:text-brand-200">
            <Sparkles className="h-4 w-4" />
            For salons, spas &amp; beauty studios
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
            Scheduling that lets you focus on your clients
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-stone-600 dark:text-stone-300">
            Viselle helps beauty and wellness businesses manage appointments, staff schedules, and
            client reminders — without spreadsheets or sticky notes. Run your chair, room, or booth
            with tools made for this industry.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to={getStartedPath()}>Get started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#pricing">See plans &amp; pricing</a>
            </Button>
          </div>
          {homepageTrial && (
            <div className="mt-4 flex justify-center">
              <Button asChild variant="ghost" size="lg" className="text-brand-700 hover:text-brand-800 dark:text-brand-300">
                <Link to={getStartedPath({ trial: true })}>
                  <Sparkles className="h-4 w-4" />
                  Start a {homepageTrial.durationDays}-day free trial — no commitment
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white py-16 dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">
              What salon owners actually need
            </h2>
            <p className="mt-3 text-stone-600 dark:text-stone-300">
              You didn&apos;t open a business to wrestle with software. Viselle keeps the busywork
              off your plate.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {INDUSTRY_FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WebsiteOptionsSection />
      <PricingSection />
      <MarketingFooter />
    </div>
  );
}
