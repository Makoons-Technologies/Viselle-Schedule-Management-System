import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { scheduleApi } from '@/lib/api';
import { DAY_NAMES, formatDateTime } from '@/lib/utils';
import { HideCancelledToggle } from '@/components/appointments/HideCancelledToggle';
import { Panel } from '@/components/common/Panel';
import { PageHeader } from '@/components/common/PageHeader';
import { AppointmentStatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { filterOutCancelled, useHideCancelledAppointments } from '@/hooks/useHideCancelledAppointments';

export function MySchedulePage() {
  const { hideCancelled, setHideCancelled } = useHideCancelledAppointments();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ['my-schedule', weekStart.toISOString()],
    queryFn: () =>
      scheduleApi.mySchedule({
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd'),
      }),
  });

  const appointments = useMemo(
    () => filterOutCancelled(data?.appointments ?? [], hideCancelled),
    [data?.appointments, hideCancelled],
  );
  const rules = data?.availabilityRules ?? [];

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="My Schedule" description="Your appointments and availability for this week" />
      <div className="mb-4">
        <HideCancelledToggle checked={hideCancelled} onCheckedChange={setHideCancelled} />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm text-stone-500">Appointments this week</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{appointments.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-stone-500">Availability rules</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{rules.length}</p></CardContent>
        </Card>
      </div>
      <Panel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appt) => (
              <TableRow key={`${appt.id}-${appt.startTime}`}>
                <TableCell>{formatDateTime(appt.startTime)}</TableCell>
                <TableCell>{formatDateTime(appt.endTime)}</TableCell>
                <TableCell>
                  <AppointmentStatusBadge
                    visitStatus={appt.visitStatus}
                    paymentStatus={appt.paymentStatus}
                    recurringAppointmentRuleId={appt.recurringAppointmentRuleId}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
      {rules.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">Weekly Availability</h3>
          <div className="flex flex-wrap gap-2">
            {rules.map((r) => (
              <span key={r.id} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm">
                {DAY_NAMES[r.dayOfWeek]} {r.startTime}–{r.endTime}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
