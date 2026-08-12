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

const fieldClass =
  'w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white caret-white placeholder:text-white/40 outline-none focus:border-[#fdeb83]/60 focus:ring-2 focus:ring-[#fdeb83]/25';

const labelClass = 'mb-1.5 block text-xs font-medium text-white/70';

const selectTriggerClass =
  'h-11 rounded-lg border-white/20 bg-white/10 text-white dark:border-white/20 dark:bg-white/10 dark:text-white';

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

        <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-8 text-white shadow-none backdrop-blur-sm sm:p-10">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Contact us</h1>
          <p className="mt-2 text-[15px] leading-7 text-white/70">
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
                <SelectTrigger id="interest" className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/15 bg-[#1e1b4b] text-white dark:border-white/15 dark:bg-[#1e1b4b]">
                  {interestOptions.map(([value, label]) => (
                    <SelectItem
                      key={value}
                      value={value}
                      className="text-white focus:bg-white/10 focus:text-white dark:text-white dark:focus:bg-white/10"
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
                {errors.name && <p className="mt-1 text-xs text-red-300">{errors.name.message}</p>}
              </div>
              <div>
                <label className={labelClass} htmlFor="email">
                  Email
                </label>
                <input id="email" type="email" className={fieldClass} {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email.message}</p>}
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
              <p className="text-xs text-white/50">
                Referring to booking page:{' '}
                <span className="font-mono text-white/80">{businessSlug}</span>
              </p>
            )}

            <div className="pt-2">
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Send message
              </Button>
              <p className="mt-3 text-xs text-white/50">
                Opens your email app to{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-medium text-[#fdeb83] hover:underline"
                >
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
