import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, endOfWeek, format, parseISO, startOfWeek } from 'date-fns';
import { ListChecks, Plus, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { APPOINTMENT_CALENDAR_LIP_CLASS, APPOINTMENT_CALENDAR_LIP_LABEL } from '@/lib/appointment-status';
import { cn } from '@/lib/utils';
import { TRIAL_LOCKED_MESSAGE } from '@/lib/trial';
import { useOrgId } from '@/hooks/useOrgId';
import { filterOutCancelled, useHideCancelledAppointments } from '@/hooks/useHideCancelledAppointments';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { useOrgTrialExpired } from '@/hooks/useOrgTrialExpired';
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
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Button } from '@/components/ui/button';

function sortDayKeys(keys: string[]): string[] {
  return [...keys].sort();
}

function formatZoomLabel(dayKeys: string[]): string {
  if (dayKeys.length === 0) return '';
  const first = parseISO(dayKeys[0]);
  if (dayKeys.length === 1) return format(first, 'EEE, MMM d');
  const last = parseISO(dayKeys[dayKeys.length - 1]);
  if (format(first, 'MMM') === format(last, 'MMM')) {
    return `${format(first, 'MMM d')} – ${format(last, 'd')}`;
  }
  return `${format(first, 'MMM d')} – ${format(last, 'MMM d')}`;
}

export function CalendarPage() {
  const orgId = useOrgId();
  const { permissions } = useStaffPermissions(orgId);
  const trialExpired = useOrgTrialExpired();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedAppointment, setSelectedAppointment] = useState<{
    id: string;
    startTime: string;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<string | undefined>(undefined);
  /** null = default all staff selected once accounts load */
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[] | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [batchSelection, setBatchSelection] = useState<Record<string, BatchCheckoutItem>>({});
  const [batchCheckoutOpen, setBatchCheckoutOpen] = useState(false);
  const { hideCancelled, setHideCancelled } = useHideCancelledAppointments();
  const [selectedDayKeys, setSelectedDayKeys] = useState<string[]>([]);
  const [zoomedDayKeys, setZoomedDayKeys] = useState<string[] | null>(null);
  const daySelectionAnchorRef = useRef<string | null>(null);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dayKeys = useMemo(() => days.map((day) => format(day, 'yyyy-MM-dd')), [days]);
  const isDayZoomed = !!zoomedDayKeys && zoomedDayKeys.length > 0;
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

  const clearDaySelection = () => {
    setSelectedDayKeys([]);
    daySelectionAnchorRef.current = null;
  };

  const exitDayZoom = () => {
    setZoomedDayKeys(null);
    clearDaySelection();
  };

  const changeWeek = (nextStart: Date) => {
    setWeekStart(nextStart);
    exitDayZoom();
  };

  const keysBetween = (fromKey: string, toKey: string): string[] => {
    const fromIndex = dayKeys.indexOf(fromKey);
    const toIndex = dayKeys.indexOf(toKey);
    if (fromIndex < 0 || toIndex < 0) return [toKey];
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    return dayKeys.slice(start, end + 1);
  };

  const handleDayHeaderSelect = (
    dayKey: string,
    event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
  ) => {
    if (event.shiftKey && daySelectionAnchorRef.current) {
      setSelectedDayKeys(keysBetween(daySelectionAnchorRef.current, dayKey));
      return;
    }

    setSelectedDayKeys((prev) => {
      const additive = event.metaKey || event.ctrlKey || prev.length > 0;
      if (!additive) {
        daySelectionAnchorRef.current = dayKey;
        return [dayKey];
      }

      // Multi-day picks are always a contiguous range (no sparse Mon+Wed).
      if (prev.includes(dayKey)) {
        if (prev.length === 1) return prev;
        const ordered = sortDayKeys(prev);
        const isEndpoint = dayKey === ordered[0] || dayKey === ordered[ordered.length - 1];
        if (isEndpoint) {
          const next = ordered.filter((key) => key !== dayKey);
          daySelectionAnchorRef.current = next[next.length - 1] ?? dayKey;
          return next;
        }
        // Interior day: collapse selection to that single day.
        daySelectionAnchorRef.current = dayKey;
        return [dayKey];
      }

      const ordered = sortDayKeys([...prev, dayKey]);
      daySelectionAnchorRef.current = dayKey;
      return keysBetween(ordered[0], ordered[ordered.length - 1]);
    });
  };

  const handleDayHeaderRangeSelect = (keys: string[]) => {
    setSelectedDayKeys(sortDayKeys(keys));
    if (keys.length > 0) {
      daySelectionAnchorRef.current = keys[0];
    }
  };

  const applyDayZoom = (keys: string[]) => {
    const ordered = sortDayKeys(keys).filter((key) => dayKeys.includes(key));
    if (ordered.length === 0) return;
    const filled = keysBetween(ordered[0], ordered[ordered.length - 1]);
    setZoomedDayKeys(filled);
    clearDaySelection();
  };

  const weekNavLabel = isDayZoomed
    ? formatZoomLabel(zoomedDayKeys)
    : `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Calendar"
        description={
          selectMode
            ? 'Select checked-in appointments to check out together'
            : isDayZoomed
              ? zoomedDayKeys.length === 1
                ? 'Focused day view — show full week to zoom out'
                : `Focused ${zoomedDayKeys.length}-day view — show full week to zoom out`
              : resolvedStaffIds.length === staffAccounts.length && staffAccounts.length > 0
                ? 'Week view of all appointments — tap day headers to zoom'
                : 'Week view of selected schedules — tap day headers to zoom'
        }
        actions={
          <div className="flex items-center gap-2">
            {batchCheckoutEnabled && (
              selectMode ? (
                <>
                  <Button variant="outline" onClick={exitSelectMode}>
                    <X className="h-4 w-4" /> Cancel selection
                  </Button>
                  <TrialLockedControl locked={trialExpired}>
                    <Button
                      onClick={() => setBatchCheckoutOpen(true)}
                      disabled={trialExpired || selectedItems.length === 0}
                    >
                      Check out ({selectedItems.length})
                    </Button>
                  </TrialLockedControl>
                </>
              ) : (
                <Button variant="outline" onClick={() => setSelectMode(true)}>
                  <ListChecks className="h-4 w-4" /> Select
                </Button>
              )
            )}
            {permissions.canCreateAppointments && (
              <TrialLockedControl locked={trialExpired}>
                <Button
                  disabled={trialExpired}
                  onClick={() => {
                    setCreateDefaultDate(undefined);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> New Appointment
                </Button>
              </TrialLockedControl>
            )}
          </div>
        }
      />
      <WeekCalendarNav
        label={weekNavLabel}
        onPrevious={() => changeWeek(addDays(weekStart, -7))}
        onNext={() => changeWeek(addDays(weekStart, 7))}
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
        trailing={
          isDayZoomed ? (
            <Button variant="outline" size="sm" onClick={exitDayZoom} className="min-h-10">
              <ZoomOut className="h-4 w-4" /> Full week
            </Button>
          ) : null
        }
      />
      {!isDayZoomed && selectedDayKeys.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm dark:border-stone-700 dark:bg-stone-900 sm:px-4">
          <p className="text-sm text-stone-700 dark:text-stone-200">
            {selectedDayKeys.length === 1
              ? '1 day selected'
              : `${selectedDayKeys.length} days selected`}
            <span className="ml-1 text-stone-500 dark:text-stone-400">
              — tap more headers to extend the range, or drag across them
            </span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearDaySelection} className="min-h-10">
              Clear
            </Button>
            <Button
              size="sm"
              className="min-h-10"
              onClick={() => applyDayZoom(selectedDayKeys)}
            >
              <ZoomIn className="h-4 w-4" />
              {selectedDayKeys.length === 1 ? 'View day' : `View ${selectedDayKeys.length} days`}
            </Button>
          </div>
        </div>
      )}
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
        selectedDayKeys={selectedDayKeys}
        zoomedDayKeys={zoomedDayKeys}
        onDayHeaderSelect={handleDayHeaderSelect}
        onDayHeaderRangeSelect={handleDayHeaderRangeSelect}
        onDayHeaderActivate={(dayKey) => applyDayZoom([dayKey])}
        onEmptySlotClick={
          permissions.canCreateAppointments && !selectMode
            ? ({ dayKey }) => {
                if (trialExpired) {
                  toast.error(TRIAL_LOCKED_MESSAGE);
                  return;
                }
                setCreateDefaultDate(dayKey);
                setCreateOpen(true);
              }
            : undefined
        }
        renderAppointment={(appt, stack) => {
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
              stackInset={!!stack && stack.isFront}
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
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95 sm:px-6 md:bottom-0">
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
              <TrialLockedControl locked={trialExpired}>
                <Button
                  size="sm"
                  onClick={() => setBatchCheckoutOpen(true)}
                  disabled={trialExpired || selectedItems.length === 0}
                >
                  Check out ({selectedItems.length})
                </Button>
              </TrialLockedControl>
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
      <CreateAppointmentDialog
        orgId={orgId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDate={createDefaultDate}
      />
    </div>
  );
}
