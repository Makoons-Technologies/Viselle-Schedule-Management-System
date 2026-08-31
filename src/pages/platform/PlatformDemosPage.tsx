import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import {
  addDays,
  demoBookingRange,
  demoBookingsInWeek,
  formatDemoDateTime,
  formatDemoTime,
  localDayKey,
  startOfWeekMonday,
  upcomingScheduledDemos,
} from '@/lib/demo';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { WeekCalendarNav } from '@/components/calendar/WeekCalendarNav';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { DemoBooking } from '@/types/api';

export function PlatformDemosPage() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [selected, setSelected] = useState<DemoBooking | null>(null);
  const autoWeekApplied = useRef(false);

  const range = useMemo(() => demoBookingRange(), []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner', 'demo-bookings', range.from, range.to],
    queryFn: () => ownerApi.listDemoBookings(range),
    refetchOnWindowFocus: true,
  });

  const allBookings = data?.bookings ?? [];
  const weekBookings = useMemo(() => demoBookingsInWeek(allBookings, weekStart), [allBookings, weekStart]);
  const upcomingDemos = useMemo(() => upcomingScheduledDemos(allBookings), [allBookings]);

  useEffect(() => {
    if (autoWeekApplied.current || upcomingDemos.length === 0) return;
    setWeekStart(startOfWeekMonday(new Date(upcomingDemos[0].startsAt)));
    autoWeekApplied.current = true;
  }, [upcomingDemos]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DemoBooking['status'] }) =>
      ownerApi.updateDemoBookingStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['owner', 'demo-bookings'] });
      setSelected(null);
      toast.success('Demo updated');
    },
    onError: () => toast.error('Could not update that demo.'),
  });

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      const key = localDayKey(date);
      return {
        date,
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        bookings: weekBookings.filter((booking) => localDayKey(new Date(booking.startsAt)) === key),
      };
    });
  }, [weekBookings, weekStart]);

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const demosOutsideWeek = upcomingDemos.filter(
    (booking) => !weekBookings.some((weekBooking) => weekBooking.id === booking.id),
  );

  return (
    <div>
      <PageHeader
        title="Demo calendar"
        description="Times people book from Request a demo. Times are shown in your local timezone."
      />

      {isError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          Could not load demo bookings. Refresh the page or try again in a moment.
        </p>
      )}

      {upcomingDemos.length > 0 && (
        <section className="mb-6 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Upcoming demos</h2>
          <ul className="mt-3 space-y-2">
            {upcomingDemos.map((booking) => (
              <li key={booking.id}>
                <button
                  type="button"
                  onClick={() => {
                    setWeekStart(startOfWeekMonday(new Date(booking.startsAt)));
                    setSelected(booking);
                  }}
                  className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800/60 sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <span className="font-medium text-stone-900 dark:text-stone-100">{booking.name}</span>
                  <span className="text-stone-500 dark:text-stone-400">{formatDemoDateTime(booking.startsAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <WeekCalendarNav
        label={weekLabel}
        onPrevious={() => setWeekStart((current) => addDays(current, -7))}
        onNext={() => setWeekStart((current) => addDays(current, 7))}
      />

      {demosOutsideWeek.length > 0 && (
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
          {demosOutsideWeek.length} upcoming demo{demosOutsideWeek.length === 1 ? '' : 's'} in another week — use
          Upcoming demos above or the arrows to jump there.
        </p>
      )}

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-7">
          {days.map((day) => (
            <section
              key={day.key}
              className="min-h-48 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                {day.label}
              </h2>
              <div className="mt-2 space-y-2">
                {day.bookings.length === 0 ? (
                  <p className="text-xs text-stone-400">No demos</p>
                ) : (
                  day.bookings.map((booking) => (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => setSelected(booking)}
                      className={cn(
                        'w-full rounded-lg border px-2 py-2 text-left text-sm',
                        booking.status === 'scheduled' &&
                          'border-brand-200 bg-brand-50 text-stone-900 dark:border-brand-800 dark:bg-brand-950/40 dark:text-stone-100',
                        booking.status === 'completed' &&
                          'border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300',
                        booking.status === 'canceled' &&
                          'border-red-200 bg-red-50 text-red-800 line-through dark:border-red-900 dark:bg-red-950/30 dark:text-red-200',
                      )}
                    >
                      <span className="block font-medium">{formatDemoTime(booking.startsAt)}</span>
                      <span className="block truncate">{booking.name}</span>
                    </button>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>{formatDemoDateTime(selected.startsAt)}</DialogDescription>
              </DialogHeader>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-stone-500 dark:text-stone-400">Email</dt>
                  <dd>
                    <a className="text-brand-700 underline dark:text-brand-300" href={`mailto:${selected.email}`}>
                      {selected.email}
                    </a>
                  </dd>
                </div>
                {selected.phone && (
                  <div>
                    <dt className="text-stone-500 dark:text-stone-400">Phone</dt>
                    <dd>{selected.phone}</dd>
                  </div>
                )}
                {selected.businessName && (
                  <div>
                    <dt className="text-stone-500 dark:text-stone-400">Business</dt>
                    <dd>{selected.businessName}</dd>
                  </div>
                )}
                {selected.notes && (
                  <div>
                    <dt className="text-stone-500 dark:text-stone-400">Notes</dt>
                    <dd className="whitespace-pre-wrap">{selected.notes}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-stone-500 dark:text-stone-400">Status</dt>
                  <dd className="capitalize">{selected.status}</dd>
                </div>
              </dl>
              {selected.status === 'scheduled' && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: selected.id, status: 'canceled' })}
                  >
                    Cancel demo
                  </Button>
                  <Button
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: selected.id, status: 'completed' })}
                  >
                    Mark completed
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {!isLoading && !isError && upcomingDemos.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={CalendarDays}
            title="No upcoming demos"
            description="New bookings from the Request a demo page show up here for the next two weeks."
          />
        </div>
      )}
    </div>
  );
}
