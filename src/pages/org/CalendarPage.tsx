import { useQuery } from '@tanstack/react-query';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { orgApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { filterOutCancelled, useHideCancelledAppointments } from '@/hooks/useHideCancelledAppointments';
import { AppointmentDetailSheet } from '@/components/appointments/AppointmentDetailSheet';
import { CreateAppointmentDialog } from '@/components/appointments/CreateAppointmentDialog';
import { HideCancelledToggle } from '@/components/appointments/HideCancelledToggle';
import { ShowAllAppointmentsToggle } from '@/components/appointments/ShowAllAppointmentsToggle';
import { WeekAppointmentTimeGrid } from '@/components/calendar/WeekAppointmentTimeGrid';
import { CalendarAppointmentChip } from '@/components/calendar/CalendarAppointmentChip';
import { WeekCalendarNav } from '@/components/calendar/WeekCalendarNav';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';

export function CalendarPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedAppointment, setSelectedAppointment] = useState<{
    id: string;
    startTime: string;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { hideCancelled, setHideCancelled } = useHideCancelledAppointments();

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
    staleTime: 0,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services', orgId],
    queryFn: () => orgApi.listServices(orgId),
    enabled: !!orgId,
  });

  const { data: recurringData } = useQuery({
    queryKey: ['recurring', orgId],
    queryFn: () => orgApi.listRecurring(orgId),
    enabled: !!orgId,
  });

  const activeRecurringRuleIds = useMemo(
    () =>
      new Set(
        (recurringData?.recurringAppointmentRules ?? [])
          .filter((rule) => rule.status === 'active' || rule.status === 'paused')
          .map((rule) => rule.id),
      ),
    [recurringData],
  );

  const customersById = useMemo(
    () => Object.fromEntries((customersData?.customers ?? []).map((customer) => [customer.id, customer])),
    [customersData],
  );

  const servicesById = useMemo(
    () => Object.fromEntries((servicesData?.services ?? []).map((service) => [service.id, service])),
    [servicesData],
  );

  const appointments = useMemo(() => {
    let list = data?.appointments ?? [];
    if (!showAll) {
      if (!user?.accountId) return [];
      list = list.filter((appt) => appt.accountId === user.accountId);
    }
    return filterOutCancelled(list, hideCancelled);
  }, [data?.appointments, showAll, user?.accountId, hideCancelled]);

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Calendar"
        description={showAll ? 'Week view of all appointments' : 'Week view of your appointments'}
        actions={
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Appointment</Button>
        }
      />
      <WeekCalendarNav
        label={`${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`}
        onPrevious={() => setWeekStart(addDays(weekStart, -7))}
        onNext={() => setWeekStart(addDays(weekStart, 7))}
        leading={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ShowAllAppointmentsToggle checked={showAll} onCheckedChange={setShowAll} />
            <HideCancelledToggle checked={hideCancelled} onCheckedChange={setHideCancelled} />
          </div>
        }
      />
      <WeekAppointmentTimeGrid
        days={days}
        appointments={appointments}
        renderAppointment={(appt) => {
          const customer = customersById[appt.customerId];
          const customerName = customer
            ? `${customer.firstName} ${customer.lastName}`.trim()
            : 'Client';
          const serviceName = servicesById[appt.serviceId]?.name ?? 'Service';

          return (
            <CalendarAppointmentChip
              customerName={customerName}
              serviceName={serviceName}
              visitStatus={appt.visitStatus}
              isRecurring={
                !!appt.recurringAppointmentRuleId &&
                activeRecurringRuleIds.has(appt.recurringAppointmentRuleId)
              }
              title={
                appt.recurringAppointmentRuleId &&
                activeRecurringRuleIds.has(appt.recurringAppointmentRuleId)
                  ? `${customerName} — ${serviceName} — recurring`
                  : `${customerName} — ${serviceName}`
              }
              onClick={() => setSelectedAppointment({ id: appt.id, startTime: appt.startTime })}
            />
          );
        }}
      />
      <AppointmentDetailSheet
        appointmentId={selectedAppointment?.id ?? null}
        occurrenceStartTime={selectedAppointment?.startTime}
        orgId={orgId}
        onClose={() => setSelectedAppointment(null)}
      />
      <CreateAppointmentDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
