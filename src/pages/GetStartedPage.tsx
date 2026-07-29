import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Globe,
  Loader2,
  Tag,
  User,
} from 'lucide-react';
import { z } from 'zod';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { marketingSeo } from '@/content/marketing-seo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { cn } from '@/lib/utils';
import { contactPath } from '@/lib/contact';
import {
  checkSlugAvailable,
  createSignupCheckout,
  fetchLiveHomepageTrial,
  fetchSignupCatalog,
  formatCents,
  previewSignupCart,
  slugifyBusinessName,
  validateTrialCode,
  websiteOptionFromParams,
  websiteOptionToAddons,
  type SignupCart,
  type SignupCatalogAddon,
  type SignupCatalogPlan,
  type SignupTierId,
  type SignupWebsiteOption,
} from '@/lib/signup';
import { ApiError } from '@/lib/api';
import type { ResolvedTrialOffer, TrialCampaign } from '@/types/api';

const STEPS = [
  { id: 'business', label: 'Your business', icon: Building2 },
  { id: 'account', label: 'Your account', icon: User },
  { id: 'plan', label: 'Choose plan', icon: CreditCard },
  { id: 'website', label: 'Website options', icon: Globe },
  { id: 'checkout', label: 'Review & pay', icon: CreditCard },
] as const;

const emailSchema = z.string().trim().email();

function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value).success;
}

/** Sync controlled inputs with browser autofill (onChange alone can miss it). */
function syncInputValue(setter: (value: string) => void) {
  return (event: FormEvent<HTMLInputElement>) => {
    setter(event.currentTarget.value);
  };
}

type AccountFieldErrors = {
  ownerName?: string;
  ownerEmail?: string;
  password?: string;
  confirmPassword?: string;
};

function getAccountFieldErrors(input: {
  ownerName: string;
  ownerEmail: string;
  password: string;
  confirmPassword: string;
}): AccountFieldErrors {
  const errors: AccountFieldErrors = {};
  if (!input.ownerName.trim()) {
    errors.ownerName = 'Enter your name';
  }
  if (!input.ownerEmail.trim()) {
    errors.ownerEmail = 'Enter your email';
  } else if (!isValidEmail(input.ownerEmail)) {
    errors.ownerEmail = 'Enter a valid email address';
  }
  if (input.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  if (!input.confirmPassword) {
    errors.confirmPassword = 'Confirm your password';
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
}

function CartSummary({ cart, compact }: { cart: SignupCart | null; compact?: boolean }) {
  if (!cart) {
    return (
      <div className="text-sm text-stone-500 dark:text-stone-400">
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
            <span className="text-stone-700 dark:text-stone-300">
              {item.name}
              {item.interval === 'month' && item.amountCents > 0 && (
                <span className="block text-xs text-stone-500 dark:text-stone-400">Billed monthly</span>
              )}
              {item.interval === 'once' && item.amountCents === 0 && (
                <span className="block text-xs text-emerald-600 dark:text-emerald-400">Included</span>
              )}
            </span>
            <span className="shrink-0 font-medium text-stone-900 dark:text-stone-100">
              {item.priceLabel
                ? item.priceLabel
                : item.amountCents === 0
                  ? 'Free'
                  : formatCents(item.amountCents)}
              {!item.priceLabel && item.interval === 'month' && item.amountCents > 0 && (
                <span className="text-xs text-stone-500 dark:text-stone-400">/mo</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-stone-200 pt-3 dark:border-stone-700">
        <div className="flex justify-between font-semibold text-stone-900 dark:text-stone-100">
          <span>Due today</span>
          <span>{formatCents(cart.dueTodayCents)}</span>
        </div>
        {cart.monthlyRecurringCents > 0 && (
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {cart.dueTodayCents === 0
              ? `Then ${formatCents(cart.monthlyRecurringCents)}/month after trial`
              : `Then ${formatCents(cart.monthlyRecurringCents)}/month for your subscription`}
          </p>
        )}
      </div>
    </div>
  );
}

type TrialCodeStatus = 'idle' | 'checking' | 'valid' | 'invalid';

function describeOffer(offer: ResolvedTrialOffer): string {
  const modeLabel = offer.paymentMode === 'free_no_card' ? 'no card required' : 'card required, charged after trial';
  if (offer.kind === 'campaign') {
    return `${offer.durationDays}-day free trial (${modeLabel}) — ${offer.name}`;
  }
  return `${offer.durationDays}-day free trial (${modeLabel}) — referred by ${offer.referringOrgName}`;
}

function TrialCodeField({
  trialCode,
  trialCodeStatus,
  trialOffer,
  useHomepageCampaign,
  homepageTrial,
  onChange,
  onCommit,
}: {
  trialCode: string;
  trialCodeStatus: TrialCodeStatus;
  trialOffer: ResolvedTrialOffer | null;
  useHomepageCampaign: boolean;
  homepageTrial: TrialCampaign | null;
  onChange: (value: string) => void;
  onCommit: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="trialCode" className="text-xs font-medium text-stone-600 dark:text-stone-400">
        Trial or referral code
      </Label>
      <div className="relative">
        <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          id="trialCode"
          value={trialCode}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onBlur={() => onCommit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Optional"
          className="pl-9"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {trialCodeStatus === 'checking' && (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
          Checking code…
        </p>
      )}
      {trialCodeStatus === 'valid' && trialOffer && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">{describeOffer(trialOffer)}</p>
      )}
      {trialCodeStatus === 'invalid' && (
        <p className="text-xs text-red-600 dark:text-red-400">
          That code is invalid or expired. Clear it to continue with a paid plan.
        </p>
      )}
      {trialCodeStatus === 'idle' && useHomepageCampaign && homepageTrial && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          {homepageTrial.durationDays}-day free trial (
          {homepageTrial.paymentMode === 'free_no_card'
            ? 'no card required'
            : 'card required, charged after trial'}
          )
        </p>
      )}
    </div>
  );
}

export function GetStartedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPlan = (searchParams.get('plan') as SignupTierId | null) ?? 'professional';
  const initialWebsiteOption = websiteOptionFromParams({
    subdomain: searchParams.get('subdomain') === '1',
    customWebsite: searchParams.get('customWebsite') === '1',
  });
  const cancelled = searchParams.get('cancelled') === '1';
  const initialCode = searchParams.get('code') ?? '';
  const trialParam = searchParams.get('trial') === '1';

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
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');

  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountTouched, setAccountTouched] = useState({
    ownerName: false,
    ownerEmail: false,
    password: false,
    confirmPassword: false,
  });
  const [accountShowAllErrors, setAccountShowAllErrors] = useState(false);

  const [tier, setTier] = useState<SignupTierId>(
    ['starter', 'professional', 'business'].includes(initialPlan) ? initialPlan : 'professional',
  );
  const [websiteOption, setWebsiteOption] = useState<SignupWebsiteOption>(initialWebsiteOption);

  const [trialCode, setTrialCode] = useState(initialCode);
  const [trialCodeStatus, setTrialCodeStatus] = useState<TrialCodeStatus>('idle');
  const [trialOffer, setTrialOffer] = useState<ResolvedTrialOffer | null>(null);
  const [committedTrialCode, setCommittedTrialCode] = useState('');
  const [homepageTrial, setHomepageTrial] = useState<TrialCampaign | null>(null);
  const [provisionedResult, setProvisionedResult] = useState<{ organizationId: string; slug: string } | null>(null);
  const committedTrialCodeRef = useRef(committedTrialCode);
  const trialValidateSeq = useRef(0);
  committedTrialCodeRef.current = committedTrialCode;

  const { subdomainAddon, customWebsiteAddon } = websiteOptionToAddons(websiteOption);

  const currentStep = STEPS[stepIndex].id;

  useEffect(() => {
    fetchSignupCatalog()
      .then((data) => setCatalog(data))
      .catch(() => setError('Could not load signup options. Please try again later.'));
  }, []);

  useEffect(() => {
    if (!trialParam || initialCode) return;
    fetchLiveHomepageTrial()
      .then((campaign) => setHomepageTrial(campaign))
      .catch(() => setHomepageTrial(null));
    // Only needs to run once on mount for the homepage-CTA entry path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitTrialCode = useCallback(async (rawCode: string) => {
    const trimmed = rawCode.trim().toUpperCase();
    if (!trimmed) {
      trialValidateSeq.current += 1;
      setTrialCode('');
      setCommittedTrialCode('');
      setTrialCodeStatus('idle');
      setTrialOffer(null);
      return;
    }

    if (trimmed === committedTrialCodeRef.current) {
      return;
    }

    const seq = ++trialValidateSeq.current;
    setTrialCodeStatus('checking');
    try {
      const offer = await validateTrialCode(trimmed);
      if (seq !== trialValidateSeq.current) return;
      setTrialCode(trimmed);
      setCommittedTrialCode(trimmed);
      setTrialOffer(offer);
      setTrialCodeStatus('valid');
    } catch {
      if (seq !== trialValidateSeq.current) return;
      setCommittedTrialCode(trimmed);
      setTrialOffer(null);
      setTrialCodeStatus('invalid');
    }
  }, []);

  // Validate ?code= from the URL once on mount.
  useEffect(() => {
    if (!initialCode.trim()) return;
    void commitTrialCode(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useHomepageCampaign =
    trialParam && trialCodeStatus === 'idle' && committedTrialCode.length === 0 && Boolean(homepageTrial);
  const activeTrialPaymentMode =
    trialCodeStatus === 'valid' && trialOffer
      ? trialOffer.paymentMode
      : useHomepageCampaign && homepageTrial
        ? homepageTrial.paymentMode
        : null;
  const isFreeTrialCheckout = activeTrialPaymentMode === 'free_no_card';

  const lockedTier: SignupTierId | null =
    trialCodeStatus === 'valid' && trialOffer
      ? trialOffer.lockedTier
      : useHomepageCampaign && homepageTrial
        ? homepageTrial.lockedTier
        : null;
  const planLocked = Boolean(lockedTier);

  useEffect(() => {
    if (lockedTier) setTier(lockedTier);
  }, [lockedTier]);

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

    let cancelled = false;
    let retryTimer: number | undefined;
    setSlugStatus('checking');
    const timer = window.setTimeout(() => {
      checkSlugAvailable(slug)
        .then((available) => {
          if (!cancelled) setSlugStatus(available ? 'available' : 'taken');
        })
        .catch(() => {
          if (cancelled) return;
          setSlugStatus('error');
          // Transient network failures left Continue disabled forever — retry once.
          retryTimer = window.setTimeout(() => {
            if (cancelled) return;
            setSlugStatus('checking');
            checkSlugAvailable(slug)
              .then((available) => {
                if (!cancelled) setSlugStatus(available ? 'available' : 'taken');
              })
              .catch(() => {
                if (!cancelled) setSlugStatus('error');
              });
          }, 1500);
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [slug]);

  const refreshCart = useCallback(async () => {
    setLoadingCart(true);
    try {
      const next = await previewSignupCart({
        tier,
        subdomainAddon,
        customWebsiteAddon,
        trialPaymentMode: activeTrialPaymentMode,
      });
      setCart(next);
    } catch {
      setCart(null);
    } finally {
      setLoadingCart(false);
    }
  }, [tier, subdomainAddon, customWebsiteAddon, activeTrialPaymentMode]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const bookingBase = (import.meta.env.VITE_BOOKING_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://viselle.net';

  const accountErrors = useMemo(
    () =>
      getAccountFieldErrors({
        ownerName,
        ownerEmail,
        password,
        confirmPassword,
      }),
    [confirmPassword, ownerEmail, ownerName, password],
  );

  const visibleAccountErrors = useMemo(() => {
    const visible: AccountFieldErrors = {};
    (Object.keys(accountErrors) as Array<keyof AccountFieldErrors>).forEach((key) => {
      const value =
        key === 'ownerName'
          ? ownerName
          : key === 'ownerEmail'
            ? ownerEmail
            : key === 'password'
              ? password
              : confirmPassword;
      const hasValue = key === 'password' || key === 'confirmPassword' ? value.length > 0 : value.trim().length > 0;
      // If password is filled but confirm is empty/mismatched, surface it (common autofill gap).
      const confirmNeedsAttention =
        key === 'confirmPassword' && password.length > 0 && Boolean(accountErrors.confirmPassword);
      const shouldShow =
        accountShowAllErrors || accountTouched[key] || (hasValue && Boolean(accountErrors[key])) || confirmNeedsAttention;
      if (shouldShow && accountErrors[key]) {
        visible[key] = accountErrors[key];
      }
    });
    return visible;
  }, [
    accountErrors,
    accountShowAllErrors,
    accountTouched,
    confirmPassword,
    ownerEmail,
    ownerName,
    password,
  ]);

  const canContinue = useMemo(() => {
    switch (currentStep) {
      case 'business':
        return businessName.trim().length > 0 && slug.length >= 2 && slugStatus === 'available';
      case 'account':
        return Object.keys(accountErrors).length === 0;
      case 'plan':
        return Boolean(tier) && Boolean(catalog);
      case 'website':
        return true;
      case 'checkout':
        return Boolean(cart) && !loadingCart && trialCodeStatus !== 'checking' && trialCodeStatus !== 'invalid';
      default:
        return false;
    }
  }, [
    accountErrors,
    businessName,
    cart,
    catalog,
    currentStep,
    loadingCart,
    slug,
    slugStatus,
    tier,
    trialCodeStatus,
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
        code: trialCodeStatus === 'valid' ? committedTrialCode : undefined,
        useHomepageCampaign,
      });

      if (result.provisioned && result.organizationId && result.slug) {
        setProvisionedResult({ organizationId: result.organizationId, slug: result.slug });
        setSubmitting(false);
        window.setTimeout(() => navigate('/login', { replace: true }), 1800);
        return;
      }

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
    if (currentStep === 'account' && Object.keys(accountErrors).length > 0) {
      setAccountShowAllErrors(true);
      return;
    }
    if (currentStep === 'business' && !canContinue) {
      return;
    }
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    }
  }

  function markAccountTouched(field: keyof typeof accountTouched) {
    setAccountTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
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
        'Your own address like yourspa.sites.viselle.net on Viselle.',
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

  if (provisionedResult) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        <PageSeo {...marketingSeo.getStartedSuccess} />
        <MarketingHeader />
        <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="mt-4">Your free trial is ready!</CardTitle>
              <CardDescription>
                {businessName} is all set — taking you to sign in as {ownerEmail}…
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <PageSeo {...marketingSeo.getStarted} />
      <MarketingHeader />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Get started with Viselle
          </h1>
          <p className="mt-2 text-stone-600 dark:text-stone-300">
            Set up your salon or spa in a few steps — plan, website options, and secure checkout.
          </p>
        </div>

        {cancelled && (
          <div className="mx-auto mt-6 max-w-4xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
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
                    active && 'bg-brand-50 font-medium text-brand-900 dark:bg-brand-950/50 dark:text-brand-100',
                    done && !active && 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-900',
                    !done && !active && 'cursor-not-allowed text-stone-400 dark:text-stone-600',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border',
                      active && 'border-brand-600 bg-brand-600 text-white',
                      done && !active && 'border-brand-600 bg-white text-brand-600 dark:bg-stone-900',
                      !done && !active && 'border-stone-200 bg-white text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-500',
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </nav>

          <Card>
            <CardHeader>
              <CardTitle>{STEPS[stepIndex].label}</CardTitle>
              <CardDescription>
                {currentStep === 'business' && 'Tell us what clients will see on your booking page.'}
                {currentStep === 'account' && 'Create the owner login for your Viselle dashboard.'}
                {currentStep === 'plan' &&
                  (planLocked
                    ? 'Your trial offer includes a set plan — plan selection is locked.'
                    : 'Every plan includes a free booking link — pick what fits your team.')}
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
                      name="organization"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      onInput={syncInputValue(setBusinessName)}
                      placeholder="Luna Hair Studio"
                      autoComplete="organization"
                    />
                    {businessName.trim().length === 0 && slug.length >= 2 && (
                      <p className="text-xs text-red-600 dark:text-red-400">Enter your business name</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Booking page URL</Label>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-sm text-stone-500 dark:text-stone-400">{bookingBase}/book/</span>
                      <Input
                        id="slug"
                        name="slug"
                        value={slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                        }}
                        placeholder="luna-hair-studio"
                        autoComplete="off"
                      />
                    </div>
                    {businessName.trim().length > 0 && slug.length < 2 && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        URL must be at least 2 characters
                      </p>
                    )}
                    {slug.length >= 2 && (
                      <p
                        className={cn(
                          'text-xs',
                          slugStatus === 'available' && 'text-emerald-600 dark:text-emerald-400',
                          (slugStatus === 'taken' || slugStatus === 'error') &&
                            'text-red-600 dark:text-red-400',
                          slugStatus === 'checking' && 'text-stone-500 dark:text-stone-400',
                        )}
                      >
                        {slugStatus === 'checking' && 'Checking availability…'}
                        {slugStatus === 'available' && 'This URL is available'}
                        {slugStatus === 'taken' && 'This URL is already taken — try another'}
                        {slugStatus === 'error' && 'Could not check this URL — wait a moment or try again'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 'account' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Your name</Label>
                    <Input
                      id="ownerName"
                      name="name"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      onInput={syncInputValue(setOwnerName)}
                      onBlur={() => markAccountTouched('ownerName')}
                      autoComplete="name"
                      aria-invalid={Boolean(visibleAccountErrors.ownerName)}
                    />
                    {visibleAccountErrors.ownerName && (
                      <p className="text-xs text-red-600 dark:text-red-400">{visibleAccountErrors.ownerName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail">Email</Label>
                    <Input
                      id="ownerEmail"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      onInput={syncInputValue(setOwnerEmail)}
                      onBlur={() => {
                        setOwnerEmail((current) => current.trim());
                        markAccountTouched('ownerEmail');
                      }}
                      autoComplete="email"
                      aria-invalid={Boolean(visibleAccountErrors.ownerEmail)}
                    />
                    {visibleAccountErrors.ownerEmail && (
                      <p className="text-xs text-red-600 dark:text-red-400">{visibleAccountErrors.ownerEmail}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <PasswordInput
                      id="password"
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onInput={syncInputValue(setPassword)}
                      onBlur={() => markAccountTouched('password')}
                      autoComplete="new-password"
                      aria-invalid={Boolean(visibleAccountErrors.password)}
                    />
                    {visibleAccountErrors.password ? (
                      <p className="text-xs text-red-600 dark:text-red-400">{visibleAccountErrors.password}</p>
                    ) : (
                      <p className="text-xs text-stone-500 dark:text-stone-400">At least 8 characters</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <PasswordInput
                      id="confirmPassword"
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onInput={syncInputValue(setConfirmPassword)}
                      onBlur={() => markAccountTouched('confirmPassword')}
                      autoComplete="new-password"
                      aria-invalid={Boolean(visibleAccountErrors.confirmPassword)}
                    />
                    {visibleAccountErrors.confirmPassword && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {visibleAccountErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 'plan' && !catalog && (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {error ? (
                    'Could not load plans. Please refresh and try again.'
                  ) : (
                    <>
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Loading plans…
                    </>
                  )}
                </p>
              )}

              {currentStep === 'plan' && catalog && (
                <div className="grid gap-4">
                  {planLocked && (
                    <p className="text-sm text-stone-600 dark:text-stone-300">
                      Plan is set by your trial offer and cannot be changed.
                    </p>
                  )}
                  {catalog.plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      disabled={planLocked}
                      aria-disabled={planLocked}
                      onClick={() => {
                        if (!planLocked) setTier(plan.id);
                      }}
                      className={cn(
                        'rounded-lg border p-4 text-left transition-colors',
                        tier === plan.id
                          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-950/40 dark:ring-brand-800'
                          : 'border-stone-200 dark:border-stone-700',
                        planLocked
                          ? 'cursor-not-allowed opacity-60'
                          : 'hover:border-stone-300 dark:hover:border-stone-600',
                        planLocked && tier !== plan.id && 'opacity-40',
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-stone-900 dark:text-stone-100">{plan.name}</p>
                          <p className="text-sm text-stone-600 dark:text-stone-300">{plan.description}</p>
                          <p className="mt-1 text-xs font-medium text-brand-700 dark:text-brand-300">{plan.staffLimit}</p>
                        </div>
                        <p className="shrink-0 font-semibold text-stone-900 dark:text-stone-100">
                          {formatCents(plan.monthlyPriceCents)}
                          <span className="text-sm font-normal text-stone-500 dark:text-stone-400">/mo</span>
                        </p>
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-stone-700 dark:text-stone-300">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
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
                          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-950/40 dark:ring-brand-800'
                          : choice.highlight
                            ? 'border-brand-200 bg-brand-50/30 hover:bg-brand-50/50 dark:border-brand-800 dark:bg-brand-950/20 dark:hover:bg-brand-950/30'
                            : 'border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800/50',
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
                        <p className="font-medium text-stone-900 dark:text-stone-100">
                          {choice.title}
                          <span className="ml-2 text-sm font-normal text-stone-500 dark:text-stone-400">{choice.price}</span>
                        </p>
                        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{choice.description}</p>
                        {choice.id === 'custom_website' && (
                          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                            No charge at checkout — our team will contact you to scope the project. You can use your
                            free booking page in the meantime.
                          </p>
                        )}
                      </div>
                    </label>
                  ))}

                  <p className="pt-1 text-sm text-stone-500 dark:text-stone-400">
                    Already have your own site?{' '}
                    <Link to={contactPath({ interest: 'api' })} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                      Contact us about API access
                    </Link>
                    .
                  </p>
                </div>
              )}

              {currentStep === 'checkout' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-300">
                    <p>
                      <span className="font-medium text-stone-900 dark:text-stone-100">{businessName}</span> ·{' '}
                      {bookingBase}/book/{slug}
                    </p>
                    <p className="mt-1">
                      Owner: {ownerName} ({ownerEmail})
                    </p>
                  </div>

                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {trialCodeStatus === 'valid' && trialOffer?.paymentMode === 'free_no_card'
                      ? 'No card needed — your account is created immediately.'
                      : useHomepageCampaign && homepageTrial?.paymentMode === 'free_no_card'
                        ? 'No card needed — your account is created immediately.'
                        : "You'll complete payment on Stripe. Your account is created automatically after payment succeeds."}
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
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

              <div className="flex items-center justify-between border-t border-stone-100 pt-4 dark:border-stone-800">
                <Button type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0 || submitting}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                {currentStep === 'checkout' ? (
                  <Button type="button" onClick={() => void handleCheckout()} disabled={!canContinue || submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isFreeTrialCheckout ? 'Creating account…' : 'Redirecting…'}
                      </>
                    ) : isFreeTrialCheckout ? (
                      'Start free trial'
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

          <aside>
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your cart</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingCart && !cart ? (
                  <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                ) : (
                  <CartSummary cart={cart} compact />
                )}
                {loadingCart && cart && (
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                    Updating amounts…
                  </p>
                )}
                <div className="border-t border-stone-200 pt-4 dark:border-stone-700">
                  <TrialCodeField
                    trialCode={trialCode}
                    trialCodeStatus={trialCodeStatus}
                    trialOffer={trialOffer}
                    useHomepageCampaign={useHomepageCampaign}
                    homepageTrial={homepageTrial}
                    onChange={setTrialCode}
                    onCommit={() => void commitTrialCode(trialCode)}
                  />
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
