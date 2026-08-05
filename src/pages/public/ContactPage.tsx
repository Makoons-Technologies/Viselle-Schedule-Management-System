import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { marketingSeo } from '@/content/marketing-seo';
import {
  CONTACT_EMAIL,
  CONTACT_INTEREST_LABELS,
  buildContactMailto,
  parseContactInterest,
  type ContactInterest,
} from '@/lib/contact';
import { MARKETING_SHELL_CLASS } from '@/lib/marketing-theme';
import { cn } from '@/lib/utils';

const schema = z.object({
  interest: z.string().min(1),
  name: z.string().min(1, 'Your name is required'),
  email: z.string().email('Enter a valid email'),
  businessName: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

/**
 * Light-card controls only — no dark: variants. The marketing shell often has
 * html.dark, which would otherwise flip inputs/labels to near-white on this card.
 */
const fieldClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 caret-stone-900 placeholder:text-stone-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500';

const labelClass = 'mb-1.5 block text-xs font-medium text-stone-600';

const selectLightClass =
  'h-11 rounded-lg border-stone-300 bg-white text-stone-900 dark:border-stone-300 dark:bg-white dark:text-stone-900';

export function ContactPage() {
  const [searchParams] = useSearchParams();
  const defaultInterest = parseContactInterest(searchParams.get('interest'));
  const businessSlug = searchParams.get('slug') ?? undefined;

  const interestOptions = useMemo(
    () => Object.entries(CONTACT_INTEREST_LABELS) as [ContactInterest, string][],
    [],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { interest: defaultInterest },
  });

  const interest = watch('interest');

  const onSubmit = (data: FormData) => {
    const mailto = buildContactMailto({
      interest: parseContactInterest(data.interest),
      name: data.name,
      email: data.email,
      businessName: data.businessName,
      phone: data.phone,
      message: data.message,
      businessSlug,
    });
    window.location.href = mailto;
    toast.success('Opening your email app — send the message to complete your request.');
  };

  return (
    <div className={MARKETING_SHELL_CLASS}>
      <PageSeo {...marketingSeo.contact} />
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-white/60">
          <Link to="/" className="hover:text-white">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>Contact</span>
        </p>

        <div className="mt-6 rounded-2xl border border-white/15 bg-white p-8 text-stone-900 shadow-2xl sm:p-10">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Contact us</h1>
          <p className="mt-2 text-[15px] leading-7 text-stone-600">
            Tell us about your salon, spa, or studio. We typically reply within one business day. For
            plan changes, sign in and use Settings → Plan.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div>
              <label className={labelClass} htmlFor="interest">
                What can we help with?
              </label>
              <Select
                value={interest}
                onValueChange={(v) => setValue('interest', v, { shouldValidate: true })}
              >
                <SelectTrigger id="interest" className={selectLightClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-stone-200 bg-white dark:border-stone-200 dark:bg-white">
                  {interestOptions.map(([value, label]) => (
                    <SelectItem
                      key={value}
                      value={value}
                      className="text-stone-900 focus:bg-brand-50 dark:text-stone-900 dark:focus:bg-brand-50"
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="name">
                  Your name
                </label>
                <input id="name" className={fieldClass} {...register('name')} />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label className={labelClass} htmlFor="email">
                  Email
                </label>
                <input id="email" type="email" className={fieldClass} {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="businessName">
                Business name
              </label>
              <input
                id="businessName"
                placeholder="e.g. Blossom Booth Spa"
                className={fieldClass}
                {...register('businessName')}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="phone">
                Phone (optional)
              </label>
              <input id="phone" type="tel" className={fieldClass} {...register('phone')} />
            </div>

            <div>
              <label className={labelClass} htmlFor="message">
                Message (optional)
              </label>
              <textarea
                id="message"
                rows={4}
                placeholder="Tell us about your team size, services, or what you're looking for..."
                className={cn(fieldClass, 'resize-y')}
                {...register('message')}
              />
            </div>

            {businessSlug && (
              <p className="text-xs text-stone-500">
                Referring to booking page: <span className="font-mono text-stone-700">{businessSlug}</span>
              </p>
            )}

            <div className="pt-2">
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Send message
              </Button>
              <p className="mt-3 text-xs text-stone-500">
                Opens your email app to{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-700 hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </form>
        </div>

        <p className="mt-12 text-sm text-white/60">
          Already use Viselle?{' '}
          <Link to="/login" className="font-medium text-white/80 hover:text-white">
            Sign in
          </Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
