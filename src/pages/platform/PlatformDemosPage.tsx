import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { formatDemoDateTime, formatDemoTime } from '@/lib/demo';
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

function startOfWeekMonday(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function PlatformDemosPage() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [selected, setSelected] = useState<DemoBooking | null>(null);

  const from = weekStart.toISOString();
  const to = addDays(weekStart, 7).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'demo-bookings', from, to],
    queryFn: () => ownerApi.listDemoBookings({ from, to }),
  });

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
    const bookings = data?.bookings ?? [];
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      const key = dayKey(date);
      return {
        date,
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        bookings: bookings.filter((booking) => dayKey(new Date(booking.startsAt)) === key),
      };
    });
  }, [data?.bookings, weekStart]);

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  return (
    <div>
      <PageHeader
        title="Demo calendar"
        description="Times people book from Request a demo. Times are shown in your local timezone."
      />

      <WeekCalendarNav
        label={weekLabel}
        onPrevious={() => setWeekStart((current) => addDays(current, -7))}
        onNext={() => setWeekStart((current) => addDays(current, 7))}
      />

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

      {!isLoading && (data?.bookings.length ?? 0) === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={CalendarDays}
            title="No demos this week"
            description="New bookings from viselle.net/request-demo show up here."
          />
        </div>
      )}
    </div>
  );
}
