import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { ListChecks, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { orgApi } from '@/lib/api';
import { APPOINTMENT_CALENDAR_LIP_CLASS, APPOINTMENT_CALENDAR_LIP_LABEL } from '@/lib/appointment-status';
import { cn } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import { filterOutCancelled, useHideCancelledAppointments } from '@/hooks/useHideCancelledAppointments';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { AppointmentDetailSheet } from '@/components/appointments/AppointmentDetailSheet';
import { BatchCheckoutSheet, type BatchCheckoutItem } from '@/components/appointments/BatchCheckoutSheet';
import { CreateAppointmentDialog } from '@/components/appointments/CreateAppointmentDialog';
import { HideCancelledToggle } from '@/components/appointments/HideCancelledToggle';
import { StaffScheduleFilter } from '@/components/calendar/StaffScheduleFilter';
import { WeekAppointmentTimeGrid } from '@/components/calendar/WeekAppointmentTimeGrid';
import { CalendarAppointmentChip } from '@/components/calendar/CalendarAppointmentChip';
import { WeekCalendarNav } from '@/components/calendar/WeekCalendarNav';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';

export function CalendarPage() {
  const orgId = useOrgId();
  const { permissions } = useStaffPermissions(orgId);
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedAppointment, setSelectedAppointment] = useState<{
    id: string;
    startTime: string;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  /** null = default all staff selected once accounts load */
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[] | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [batchSelection, setBatchSelection] = useState<Record<string, BatchCheckoutItem>>({});
  const [batchCheckoutOpen, setBatchCheckoutOpen] = useState(false);
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

  const { data: orgData } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => orgApi.getOrganization(orgId),
    enabled: !!orgId,
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId,
  });

  const batchCheckoutEnabled =
    (orgData?.organization.batchCheckoutEnabled ?? false) && permissions.canBatchCheckout;

  const staffAccounts = useMemo(() => {
    return (accountsData?.accounts ?? [])
      .filter((account) => account.status === 'active' && account.isBookable)
      .slice()
      .sort((a, b) => {
        const last = a.lastName.localeCompare(b.lastName);
        return last !== 0 ? last : a.firstName.localeCompare(b.firstName);
      });
  }, [accountsData]);

  const resolvedStaffIds = useMemo(() => {
    if (selectedStaffIds !== null) return selectedStaffIds;
    return staffAccounts.map((account) => account.id);
  }, [selectedStaffIds, staffAccounts]);

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
    const selected = new Set(resolvedStaffIds);
    const list = (data?.appointments ?? []).filter((appt) => selected.has(appt.accountId));
    return filterOutCancelled(list, hideCancelled);
  }, [data?.appointments, resolvedStaffIds, hideCancelled]);

  const selectedItems = useMemo(() => Object.values(batchSelection), [batchSelection]);

  const toggleBatchSelection = (item: BatchCheckoutItem) => {
    setBatchSelection((prev) => {
      const next = { ...prev };
      if (next[item.appointmentId]) {
        delete next[item.appointmentId];
      } else {
        next[item.appointmentId] = item;
      }
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setBatchSelection({});
  };

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Calendar"
        description={
          selectMode
            ? 'Select checked-in appointments to check out together'
            : resolvedStaffIds.length === staffAccounts.length && staffAccounts.length > 0
              ? 'Week view of all appointments'
              : 'Week view of selected schedules'
        }
        actions={
          <div className="flex items-center gap-2">
            {batchCheckoutEnabled && (
              selectMode ? (
                <Button variant="outline" onClick={exitSelectMode}>
                  <X className="h-4 w-4" /> Cancel selection
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setSelectMode(true)}>
                  <ListChecks className="h-4 w-4" /> Select
                </Button>
              )
            )}
            {permissions.canCreateAppointments && (
              <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Appointment</Button>
            )}
          </div>
        }
      />
      <WeekCalendarNav
        label={`${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`}
        onPrevious={() => setWeekStart(addDays(weekStart, -7))}
        onNext={() => setWeekStart(addDays(weekStart, 7))}
        leading={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <StaffScheduleFilter
              accounts={staffAccounts}
              selectedIds={resolvedStaffIds}
              onSelectedIdsChange={setSelectedStaffIds}
            />
            <HideCancelledToggle checked={hideCancelled} onCheckedChange={setHideCancelled} />
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-600 dark:text-stone-300">
        {(Object.keys(APPOINTMENT_CALENDAR_LIP_CLASS) as Array<keyof typeof APPOINTMENT_CALENDAR_LIP_CLASS>)
          .filter((state) => state !== 'cancelled')
          .map((state) => (
            <span key={state} className="inline-flex items-center gap-1.5">
              <span className={cn('h-1.5 w-6 rounded-full', APPOINTMENT_CALENDAR_LIP_CLASS[state])} aria-hidden />
              {APPOINTMENT_CALENDAR_LIP_LABEL[state]}
            </span>
          ))}
      </div>
      <WeekAppointmentTimeGrid
        days={days}
        appointments={appointments}
        renderAppointment={(appt) => {
          const customer = customersById[appt.customerId];
          const customerName = customer
            ? `${customer.firstName} ${customer.lastName}`.trim()
            : 'Client';
          const serviceName = servicesById[appt.serviceId]?.name ?? 'Service';
          const checkoutEligible = appt.visitStatus === 'arrived' && appt.paymentStatus === 'unpaid';

          return (
            <CalendarAppointmentChip
              customerName={customerName}
              serviceName={serviceName}
              visitStatus={appt.visitStatus}
              paymentStatus={appt.paymentStatus}
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
              selectMode={selectMode}
              selected={!!batchSelection[appt.id]}
              selectable={checkoutEligible}
              onClick={() =>
                selectMode
                  ? toggleBatchSelection({
                      appointmentId: appt.id,
                      serviceId: appt.serviceId,
                      customerName,
                      serviceName,
                    })
                  : setSelectedAppointment({ id: appt.id, startTime: appt.startTime })
              }
            />
          );
        }}
      />
      {selectMode && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
              {selectedItems.length} appointment{selectedItems.length === 1 ? '' : 's'} selected
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBatchSelection({})}
                disabled={selectedItems.length === 0}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => setBatchCheckoutOpen(true)}
                disabled={selectedItems.length === 0}
              >
                Check out ({selectedItems.length})
              </Button>
            </div>
          </div>
        </div>
      )}
      <AppointmentDetailSheet
        appointmentId={selectedAppointment?.id ?? null}
        occurrenceStartTime={selectedAppointment?.startTime}
        orgId={orgId}
        onClose={() => setSelectedAppointment(null)}
      />
      <BatchCheckoutSheet
        orgId={orgId}
        items={selectedItems}
        open={batchCheckoutOpen}
        onOpenChange={setBatchCheckoutOpen}
        onSuccess={() => {
          exitSelectMode();
          queryClient.invalidateQueries({ queryKey: ['appointments', orgId] });
        }}
      />
      <CreateAppointmentDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
