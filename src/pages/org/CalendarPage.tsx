import { useQuery } from '@tanstack/react-query';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { orgApi } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import { AppointmentDetailSheet } from '@/components/appointments/AppointmentDetailSheet';
import { CreateAppointmentDialog } from '@/components/appointments/CreateAppointmentDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { AppointmentStatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function CalendarPage() {
  const orgId = useOrgId();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', orgId, weekStart.toISOString()],
    queryFn: () =>
      orgApi.listAppointments(orgId, {
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd'),
      }),
    enabled: !!orgId,
  });

  const appointments = data?.appointments ?? [];

  const byDay = useMemo(() => {
    const map = new Map<string, typeof appointments>();
    for (const day of days) {
      map.set(format(day, 'yyyy-MM-dd'), []);
    }
    for (const appt of appointments) {
      const key = format(new Date(appt.startTime), 'yyyy-MM-dd');
      const list = map.get(key);
      if (list) list.push(appt);
    }
    return map;
  }, [appointments, days]);

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Week view of all appointments"
        actions={
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Appointment</Button>
        }
      />
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </span>
        <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayAppts = byDay.get(key) ?? [];
          return (
            <Card key={key} className="min-h-48">
              <CardContent className="p-3">
                <p className="mb-2 text-xs font-semibold text-stone-500">{format(day, 'EEE d')}</p>
                <div className="space-y-2">
                  {dayAppts
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .map((appt) => (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={() => setSelectedId(appt.id)}
                        className="w-full rounded-lg border border-brand-100 bg-brand-50 p-2 text-left text-xs hover:bg-brand-100"
                      >
                        <p className="font-medium">{formatTime(appt.startTime)}</p>
                        <AppointmentStatusBadge status={appt.status} />
                      </button>
                    ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <AppointmentDetailSheet appointmentId={selectedId} orgId={orgId} onClose={() => setSelectedId(null)} />
      <CreateAppointmentDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
