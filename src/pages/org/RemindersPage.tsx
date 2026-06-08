import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { orgApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import { PageHeader } from '@/components/common/PageHeader';
import { AppointmentStatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RemindersPage() {
  const orgId = useOrgId();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', orgId],
    queryFn: () => orgApi.listAppointments(orgId),
    enabled: !!orgId,
  });

  if (isLoading) return <LoadingState />;

  const upcoming = (appointments?.appointments ?? []).filter(
    (a) => a.status !== 'cancelled' && new Date(a.startTime) > new Date(),
  );

  return (
    <div>
      <PageHeader
        title="Reminders"
        description="Upcoming appointments eligible for SMS and email reminders"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {upcoming.map((appt) => (
          <Card key={appt.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{formatDateTime(appt.startTime)}</CardTitle>
              <Bell className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <AppointmentStatusBadge status={appt.status} />
              <p className="text-stone-500">View appointment details to send reminders manually.</p>
              <Badge variant="secondary">SMS & Email available</Badge>
            </CardContent>
          </Card>
        ))}
        {upcoming.length === 0 && (
          <p className="text-sm text-stone-500">No upcoming appointments requiring reminders.</p>
        )}
      </div>
    </div>
  );
}
