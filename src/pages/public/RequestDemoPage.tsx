import { useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MarketingFooter, MarketingHeader } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { marketingSeo } from '@/content/marketing-seo';
import { ApiError } from '@/lib/api';
import { bookDemo, demoDayKey, fetchDemoSlots, formatDemoDayLabel, formatDemoTime } from '@/lib/demo';
import { getStartedPath } from '@/lib/signup';
import { MARKETING_SHELL_CLASS } from '@/lib/marketing-theme';
import { cn } from '@/lib/utils';
import type { DemoBooking, DemoSlot } from '@/types/api';

const fieldClass =
  'w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white caret-white placeholder:text-white/40 outline-none focus:border-[#fdeb83]/60 focus:ring-2 focus:ring-[#fdeb83]/25';
const labelClass = 'mb-1.5 block text-xs font-medium text-white/70';

export function RequestDemoPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<DemoSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<DemoBooking | null>(null);

  const slotsQuery = useQuery({
    queryKey: ['demo', 'slots'],
    queryFn: fetchDemoSlots,
  });

  const days = useMemo(() => {
    const grouped = new Map<string, DemoSlot[]>();
    for (const slot of slotsQuery.data?.slots ?? []) {
      const key = demoDayKey(slot.startsAt);
      const list = grouped.get(key) ?? [];
      list.push(slot);
      grouped.set(key, list);
    }
    return [...grouped.entries()].map(([key, slots]) => ({
      key,
      label: formatDemoDayLabel(slots[0].startsAt),
      slots,
    }));
  }, [slotsQuery.data?.slots]);

  const activeDay = selectedDay && days.some((day) => day.key === selectedDay) ? selectedDay : days[0]?.key ?? null;
  const daySlots = days.find((day) => day.key === activeDay)?.slots ?? [];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !selectedSlot) {
      toast.error('Enter your name, email, and a time.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await bookDemo({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        businessName: businessName.trim() || undefined,
        notes: notes.trim() || undefined,
        startsAt: selectedSlot.startsAt,
      });
      setBooking(result);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not book that time. Please try another slot.';
      toast.error(message);
      void slotsQuery.refetch();
      setSelectedSlot(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={MARKETING_SHELL_CLASS}>
      <PageSeo {...marketingSeo.requestDemo} />
      <MarketingHeader />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        {booking ? (
          <div className="rounded-2xl border border-white/15 bg-white/10 p-8 text-center text-white backdrop-blur-sm">
            <CalendarCheck className="mx-auto h-10 w-10 text-[#fdeb83]" />
            <h1 className="mt-4 text-3xl font-bold tracking-tight">You&apos;re on the calendar</h1>
            <p className="mt-3 text-white/75">
              We booked a 30-minute Viselle demo for {formatDemoDayLabel(booking.startsAt)} at{' '}
              {formatDemoTime(booking.startsAt)}. A confirmation is on its way if we have a working inbox — add it to
              your calendar either way.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link to={getStartedPath()}>Start a trial now</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white">
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Request a demo</h1>
              <p className="mt-3 text-white/70">
                Pick a time and we&apos;ll walk you through Viselle for your salon or spa. 30 minutes. No pitch deck
                required.
              </p>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)} className="mt-10 space-y-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="demo-name">
                    Your name
                  </label>
                  <input
                    id="demo-name"
                    className={fieldClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="demo-email">
                    Email
                  </label>
                  <input
                    id="demo-email"
                    type="email"
                    className={fieldClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="demo-phone">
                    Phone <span className="text-white/40">(optional)</span>
                  </label>
                  <input
                    id="demo-phone"
                    type="tel"
                    className={fieldClass}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="demo-business">
                    Business name <span className="text-white/40">(optional)</span>
                  </label>
                  <input
                    id="demo-business"
                    className={fieldClass}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    autoComplete="organization"
                  />
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-white">Choose a day</p>
                {slotsQuery.isLoading ? (
                  <p className="text-sm text-white/60">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Loading times…
                  </p>
                ) : slotsQuery.isError ? (
                  <p className="text-sm text-white/70">
                    Could not load open times. Refresh the page or email{' '}
                    <a className="underline" href="mailto:hello@viselle.net">
                      hello@viselle.net
                    </a>
                    .
                  </p>
                ) : days.length === 0 ? (
                  <p className="text-sm text-white/70">
                    No open demo times in the next two weeks. Email{' '}
                    <a className="underline" href="mailto:hello@viselle.net">
                      hello@viselle.net
                    </a>
                    .
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {days.map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => {
                          setSelectedDay(day.key);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-sm',
                          activeDay === day.key
                            ? 'border-[#fdeb83] bg-[#fdeb83]/15 text-[#fdeb83]'
                            : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10',
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {daySlots.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-white">Choose a time</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {daySlots.map((slot) => (
                      <button
                        key={slot.startsAt}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-sm',
                          selectedSlot?.startsAt === slot.startsAt
                            ? 'border-[#fdeb83] bg-[#fdeb83]/15 text-[#fdeb83]'
                            : 'border-white/20 bg-white/5 text-white/85 hover:bg-white/10',
                        )}
                      >
                        {formatDemoTime(slot.startsAt)}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-white/50">Times are shown in your local timezone.</p>
                </div>
              )}

              <div>
                <label className={labelClass} htmlFor="demo-notes">
                  Anything we should know? <span className="text-white/40">(optional)</span>
                </label>
                <textarea
                  id="demo-notes"
                  className={cn(fieldClass, 'min-h-24')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button type="submit" size="lg" disabled={!selectedSlot || submitting || !name.trim() || !email.trim()}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Booking…
                  </>
                ) : (
                  'Book this demo'
                )}
              </Button>
            </form>
          </>
        )}
      </div>
      <MarketingFooter />
    </div>
  );
}
