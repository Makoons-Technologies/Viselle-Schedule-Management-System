import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  BookingPageTitle,
  BookingPublicShell,
  BookingSectionLabel,
  BookingStickyAction,
} from '@/components/booking/BookingPublicShell';
import { bookingTheme } from '@/components/booking/booking-theme';
import { MarketingHeader } from '@/components/marketing/MarketingLayout';
import {
  CONTACT_EMAIL,
  CONTACT_INTEREST_LABELS,
  buildContactMailto,
  parseContactInterest,
  type ContactInterest,
} from '@/lib/contact';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  'w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-400';

export function ContactPage() {
  const [searchParams] = useSearchParams();
  const defaultInterest = parseContactInterest(searchParams.get('interest'));
  const businessSlug = searchParams.get('slug') ?? undefined;
  const theme = bookingTheme('modern');

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
    <div className="min-h-screen bg-neutral-100">
      <MarketingHeader />

      <BookingPublicShell
        subtitle="We typically reply within one business day"
        showPoweredBy={false}
        siteTemplate="modern"
        footer={
          <p className="mb-2 text-sm text-neutral-500">
            Already use Viselle?{' '}
            <Link to="/login" className="font-medium text-brand-700 hover:underline">
              Sign in
            </Link>
          </p>
        }
      >
        <BookingPageTitle>Contact us</BookingPageTitle>
        <p className="-mt-4 mb-6 text-sm text-neutral-500">
          Tell us about your salon, spa, or studio. We&apos;ll help you pick the right plan and booking setup.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="space-y-4">
            <div>
              <BookingSectionLabel>What can we help with?</BookingSectionLabel>
              <Select
                value={interest}
                onValueChange={(v) => setValue('interest', v, { shouldValidate: true })}
              >
                <SelectTrigger className="h-12 rounded-xl border-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interestOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600">Your name</label>
                <input id="name" className={fieldClass} {...register('name')} />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600">Email</label>
                <input id="email" type="email" className={fieldClass} {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">Business name</label>
              <input
                id="businessName"
                placeholder="e.g. Blossom Booth Spa"
                className={fieldClass}
                {...register('businessName')}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">Phone (optional)</label>
              <input id="phone" type="tel" className={fieldClass} {...register('phone')} />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">Message (optional)</label>
              <textarea
                id="message"
                rows={4}
                placeholder="Tell us about your team size, services, or what you're looking for..."
                className={fieldClass}
                {...register('message')}
              />
            </div>

            {businessSlug && (
              <p className="text-xs text-neutral-500">
                Referring to booking page: <span className="font-mono">{businessSlug}</span>
              </p>
            )}
          </div>

          <BookingStickyAction>
            <button
              type="submit"
              className={cn('w-full rounded-full py-4 text-base font-semibold', theme.primaryBtn)}
            >
              Send message
            </button>
            <p className="mt-3 text-center text-xs text-neutral-500">
              Opens your email app to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-700 hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </BookingStickyAction>
        </form>
      </BookingPublicShell>
    </div>
  );
}
