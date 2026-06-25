import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Globe,
  Loader2,
  User,
} from 'lucide-react';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { contactPath } from '@/lib/contact';
import {
  checkSlugAvailable,
  createSignupCheckout,
  fetchSignupCatalog,
  formatCents,
  previewSignupCart,
  slugifyBusinessName,
  websiteOptionFromParams,
  websiteOptionToAddons,
  type SignupCart,
  type SignupCatalogAddon,
  type SignupCatalogPlan,
  type SignupTierId,
  type SignupWebsiteOption,
} from '@/lib/signup';
import { ApiError } from '@/lib/api';

const STEPS = [
  { id: 'business', label: 'Your business', icon: Building2 },
  { id: 'account', label: 'Your account', icon: User },
  { id: 'plan', label: 'Choose plan', icon: CreditCard },
  { id: 'website', label: 'Website options', icon: Globe },
  { id: 'checkout', label: 'Review & pay', icon: CreditCard },
] as const;

function CartSummary({ cart, compact }: { cart: SignupCart | null; compact?: boolean }) {
  if (!cart) {
    return (
      <div className="text-sm text-stone-500">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        Calculating…
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', compact && 'text-sm')}>
      <ul className="space-y-2">
        {cart.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3">
            <span className="text-stone-700">
              {item.name}
              {item.interval === 'month' && item.amountCents > 0 && (
                <span className="block text-xs text-stone-500">Billed monthly</span>
              )}
              {item.interval === 'once' && item.amountCents === 0 && (
                <span className="block text-xs text-emerald-600">Included</span>
              )}
            </span>
            <span className="shrink-0 font-medium text-stone-900">
              {item.priceLabel
                ? item.priceLabel
                : item.amountCents === 0
                  ? 'Free'
                  : formatCents(item.amountCents)}
              {!item.priceLabel && item.interval === 'month' && item.amountCents > 0 && (
                <span className="text-xs text-stone-500">/mo</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-stone-200 pt-3">
        <div className="flex justify-between font-semibold text-stone-900">
          <span>Due today</span>
          <span>{formatCents(cart.dueTodayCents)}</span>
        </div>
        {cart.monthlyRecurringCents > 0 && (
          <p className="mt-1 text-xs text-stone-500">
            Then {formatCents(cart.monthlyRecurringCents)}/month for your subscription
          </p>
        )}
      </div>
    </div>
  );
}

export function GetStartedPage() {
  const [searchParams] = useSearchParams();
  const initialPlan = (searchParams.get('plan') as SignupTierId | null) ?? 'professional';
  const initialWebsiteOption = websiteOptionFromParams({
    subdomain: searchParams.get('subdomain') === '1',
    customWebsite: searchParams.get('customWebsite') === '1',
  });
  const cancelled = searchParams.get('cancelled') === '1';

  const [stepIndex, setStepIndex] = useState(0);
  const [catalog, setCatalog] = useState<{
    plans: SignupCatalogPlan[];
    addons: SignupCatalogAddon[];
    included: { name: string; description: string };
  } | null>(null);
  const [cart, setCart] = useState<SignupCart | null>(null);
  const [loadingCart, setLoadingCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [tier, setTier] = useState<SignupTierId>(
    ['starter', 'professional', 'business'].includes(initialPlan) ? initialPlan : 'professional',
  );
  const [websiteOption, setWebsiteOption] = useState<SignupWebsiteOption>(initialWebsiteOption);

  const { subdomainAddon, customWebsiteAddon } = websiteOptionToAddons(websiteOption);

  const currentStep = STEPS[stepIndex].id;

  useEffect(() => {
    fetchSignupCatalog()
      .then((data) => setCatalog(data))
      .catch(() => setError('Could not load signup options. Please try again later.'));
  }, []);

  useEffect(() => {
    if (!slugTouched && businessName) {
      setSlug(slugifyBusinessName(businessName));
    }
  }, [businessName, slugTouched]);

  useEffect(() => {
    if (slug.length < 2) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    const timer = window.setTimeout(() => {
      checkSlugAvailable(slug)
        .then((available) => setSlugStatus(available ? 'available' : 'taken'))
        .catch(() => setSlugStatus('idle'));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [slug]);

  const refreshCart = useCallback(async () => {
    setLoadingCart(true);
    try {
      const next = await previewSignupCart({ tier, subdomainAddon, customWebsiteAddon });
      setCart(next);
    } catch {
      setCart(null);
    } finally {
      setLoadingCart(false);
    }
  }, [tier, subdomainAddon, customWebsiteAddon]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const bookingBase = (import.meta.env.VITE_BOOKING_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://viselle.app';

  const canContinue = useMemo(() => {
    switch (currentStep) {
      case 'business':
        return businessName.trim().length > 0 && slug.length >= 2 && slugStatus === 'available';
      case 'account':
        return (
          ownerName.trim().length > 0 &&
          ownerEmail.includes('@') &&
          password.length >= 8 &&
          password === confirmPassword
        );
      case 'plan':
        return Boolean(tier);
      case 'website':
        return true;
      case 'checkout':
        return Boolean(cart);
      default:
        return false;
    }
  }, [
    businessName,
    cart,
    confirmPassword,
    currentStep,
    ownerEmail,
    ownerName,
    password,
    slug,
    slugStatus,
    tier,
  ]);

  async function handleCheckout() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await createSignupCheckout({
        businessName: businessName.trim(),
        slug: slug.trim().toLowerCase(),
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        password,
        tier,
        subdomainAddon,
        customWebsiteAddon,
      });
      window.location.href = result.checkoutUrl!;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Checkout is unavailable right now. Please contact us to get started.';
      setError(message);
      setSubmitting(false);
    }
  }

  function goNext() {
    setError(null);
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    }
  }

  function goBack() {
    setError(null);
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  }

  const subdomainAddonInfo = catalog?.addons.find((a) => a.id === 'subdomain');
  const customWebsiteAddonInfo = catalog?.addons.find((a) => a.id === 'custom_website');

  const websiteChoices: Array<{
    id: SignupWebsiteOption;
    title: string;
    price: string;
    description: string;
    highlight?: boolean;
  }> = [
    {
      id: 'free',
      title: catalog?.included.name ?? 'Free booking page',
      price: 'Included',
      description:
        catalog?.included.description ??
        `Share ${bookingBase}/book/${slug || 'your-business'} — included with every plan.`,
    },
    {
      id: 'subdomain',
      title: subdomainAddonInfo?.name ?? 'Hosted subdomain',
      price: subdomainAddonInfo?.priceCents
        ? `${formatCents(subdomainAddonInfo.priceCents)}/mo`
        : '$19/mo',
      description:
        subdomainAddonInfo?.description ??
        'Your own address like yourspa.viselle.app on Viselle.',
    },
    {
      id: 'custom_website',
      title: customWebsiteAddonInfo?.name ?? 'Custom website build',
      price: customWebsiteAddonInfo?.priceLabel ?? 'To be determined',
      description:
        customWebsiteAddonInfo?.description ??
        'We design and launch a branded site for your salon. Until it is ready, you can take bookings on your free booking page. We will reach out after signup to discuss details.',
      highlight: true,
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <MarketingHeader />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Get started with Viselle</h1>
          <p className="mt-2 text-stone-600">
            Set up your salon or spa in a few steps — plan, website options, and secure checkout.
          </p>
        </div>

        {cancelled && (
          <div className="mx-auto mt-6 max-w-4xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Checkout was cancelled. Your selections are saved — continue when you&apos;re ready.
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr_300px]">
          <nav className="space-y-1">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const done = index < stepIndex;
              const active = index === stepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => index <= stepIndex && setStepIndex(index)}
                  disabled={index > stepIndex}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                    active && 'bg-brand-50 font-medium text-brand-900',
                    done && !active && 'text-stone-700 hover:bg-stone-100',
                    !done && !active && 'cursor-not-allowed text-stone-400',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border',
                      active && 'border-brand-600 bg-brand-600 text-white',
                      done && !active && 'border-brand-600 bg-white text-brand-600',
                      !done && !active && 'border-stone-200 bg-white text-stone-400',
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </nav>

          <Card className="border-stone-200">
            <CardHeader>
              <CardTitle>{STEPS[stepIndex].label}</CardTitle>
              <CardDescription>
                {currentStep === 'business' && 'Tell us what clients will see on your booking page.'}
                {currentStep === 'account' && 'Create the owner login for your Viselle dashboard.'}
                {currentStep === 'plan' && 'Every plan includes a free booking link — pick what fits your team.'}
                {currentStep === 'website' && 'Optional upgrades you can add now or later.'}
                {currentStep === 'checkout' && 'Review your cart, then pay securely with Stripe.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentStep === 'business' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business name</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Luna Hair Studio"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Booking page URL</Label>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-sm text-stone-500">{bookingBase}/book/</span>
                      <Input
                        id="slug"
                        value={slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                        }}
                        placeholder="luna-hair-studio"
                      />
                    </div>
                    {slug.length >= 2 && (
                      <p
                        className={cn(
                          'text-xs',
                          slugStatus === 'available' && 'text-emerald-600',
                          slugStatus === 'taken' && 'text-red-600',
                          slugStatus === 'checking' && 'text-stone-500',
                        )}
                      >
                        {slugStatus === 'checking' && 'Checking availability…'}
                        {slugStatus === 'available' && 'This URL is available'}
                        {slugStatus === 'taken' && 'This URL is already taken — try another'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 'account' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Your name</Label>
                    <Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail">Email</Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-stone-500">At least 8 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              {currentStep === 'plan' && catalog && (
                <div className="grid gap-4">
                  {catalog.plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setTier(plan.id)}
                      className={cn(
                        'rounded-lg border p-4 text-left transition-colors',
                        tier === plan.id
                          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200'
                          : 'border-stone-200 hover:border-stone-300',
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-stone-900">{plan.name}</p>
                          <p className="text-sm text-stone-600">{plan.description}</p>
                          <p className="mt-1 text-xs font-medium text-brand-700">{plan.staffLimit}</p>
                        </div>
                        <p className="shrink-0 font-semibold text-stone-900">
                          {formatCents(plan.monthlyPriceCents)}
                          <span className="text-sm font-normal text-stone-500">/mo</span>
                        </p>
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-stone-700">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === 'website' && (
                <div className="space-y-3" role="radiogroup" aria-label="Website option">
                  {websiteChoices.map((choice) => (
                    <label
                      key={choice.id}
                      className={cn(
                        'flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors',
                        websiteOption === choice.id
                          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200'
                          : choice.highlight
                            ? 'border-brand-200 bg-brand-50/30 hover:bg-brand-50/50'
                            : 'border-stone-200 hover:bg-stone-50',
                      )}
                    >
                      <input
                        type="radio"
                        name="websiteOption"
                        className="mt-1"
                        checked={websiteOption === choice.id}
                        onChange={() => setWebsiteOption(choice.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-stone-900">
                          {choice.title}
                          <span className="ml-2 text-sm font-normal text-stone-500">{choice.price}</span>
                        </p>
                        <p className="mt-1 text-sm text-stone-600">{choice.description}</p>
                        {choice.id === 'custom_website' && (
                          <p className="mt-2 text-xs text-stone-500">
                            No charge at checkout — our team will contact you to scope the project. You can use your
                            free booking page in the meantime.
                          </p>
                        )}
                      </div>
                    </label>
                  ))}

                  <p className="pt-1 text-sm text-stone-500">
                    Already have your own site?{' '}
                    <Link to={contactPath({ interest: 'api' })} className="font-medium text-brand-700 hover:underline">
                      Contact us about API access
                    </Link>
                    .
                  </p>
                </div>
              )}

              {currentStep === 'checkout' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    <p>
                      <span className="font-medium text-stone-900">{businessName}</span> ·{' '}
                      {bookingBase}/book/{slug}
                    </p>
                    <p className="mt-1">
                      Owner: {ownerName} ({ownerEmail})
                    </p>
                  </div>
                  <CartSummary cart={cart} />
                  <p className="text-xs text-stone-500">
                    You&apos;ll complete payment on Stripe. Your account is created automatically after payment
                    succeeds.
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                  {error.includes('not configured') && (
                    <span>
                      {' '}
                      <Link to={contactPath()} className="font-medium underline">
                        Contact us
                      </Link>{' '}
                      instead.
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-stone-100 pt-4">
                <Button type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0 || submitting}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                {currentStep === 'checkout' ? (
                  <Button type="button" onClick={() => void handleCheckout()} disabled={!canContinue || submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting…
                      </>
                    ) : (
                      'Continue to Stripe'
                    )}
                  </Button>
                ) : (
                  <Button type="button" onClick={goNext} disabled={!canContinue}>
                    Continue
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <aside className="hidden lg:block">
            <Card className="sticky top-6 border-stone-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your cart</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCart ? (
                  <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                ) : (
                  <CartSummary cart={cart} compact />
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
