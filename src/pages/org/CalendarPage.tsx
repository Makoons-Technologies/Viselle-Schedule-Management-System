import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, parseISO, startOfDay } from 'date-fns';
import { ListChecks, Plus, SlidersHorizontal, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { APPOINTMENT_CALENDAR_LIP_CLASS, APPOINTMENT_CALENDAR_LIP_LABEL } from '@/lib/appointment-status';
import { cn, formatTimeRange } from '@/lib/utils';
import { TRIAL_LOCKED_MESSAGE } from '@/lib/trial';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { filterOutCancelled, useHideCancelledAppointments } from '@/hooks/useHideCancelledAppointments';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useMyAppointmentsOnly } from '@/hooks/useMyAppointmentsOnly';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { AppointmentDetailSheet } from '@/components/appointments/AppointmentDetailSheet';
import { BatchCheckoutSheet, type BatchCheckoutItem } from '@/components/appointments/BatchCheckoutSheet';
import { CreateAppointmentDialog } from '@/components/appointments/CreateAppointmentDialog';
import { StaffScheduleFilter } from '@/components/calendar/StaffScheduleFilter';
import { WeekAppointmentTimeGrid } from '@/components/calendar/WeekAppointmentTimeGrid';
import { CalendarAppointmentChip } from '@/components/calendar/CalendarAppointmentChip';
import { WeekCalendarNav } from '@/components/calendar/WeekCalendarNav';
import { LoadingState } from '@/components/common/LoadingState';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { user, memberships } = useAuth();
  const { permissions } = useStaffPermissions(orgId);
  const trialExpired = useOrgWriteLocked();
  const queryClient = useQueryClient();
  /** Matches Tailwind `md` — same breakpoint as mobile bottom nav. */
  const isMobile = useMediaQuery('(max-width: 767px)');
  const { myAppointmentsOnly, setMyAppointmentsOnly } = useMyAppointmentsOnly();
  const [weekStart, setWeekStart] = useState(() => startOfDay(new Date()));
  const [selectedAppointment, setSelectedAppointment] = useState<{
    id: string;
    startTime: string;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<string | undefined>(undefined);
  const [createDefaultMinutes, setCreateDefaultMinutes] = useState<number | undefined>(undefined);
  /** null = default all staff selected once accounts load (desktop picker). */
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[] | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [batchSelection, setBatchSelection] = useState<Record<string, BatchCheckoutItem>>({});
  const [batchCheckoutOpen, setBatchCheckoutOpen] = useState(false);
  const { hideCancelled, setHideCancelled } = useHideCancelledAppointments();
  const [selectedDayKeys, setSelectedDayKeys] = useState<string[]>([]);
  const [zoomedDayKeys, setZoomedDayKeys] = useState<string[] | null>(null);
  const daySelectionAnchorRef = useRef<string | null>(null);

  const weekEnd = addDays(weekStart, 6);
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
    (orgData?.organization.batchCheckoutEnabled ?? true) && permissions.canBatchCheckout;

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

  const myAccountId = useMemo(() => {
    if (user?.accountId) return user.accountId;
    return memberships.find((membership) => membership.organizationId === orgId)?.accountId ?? null;
  }, [user?.accountId, memberships, orgId]);

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

  const accountsById = useMemo(
    () => Object.fromEntries((accountsData?.accounts ?? []).map((account) => [account.id, account])),
    [accountsData],
  );

  const appointments = useMemo(() => {
    const list = data?.appointments ?? [];
    let filtered = list;
    if (isMobile) {
      // Filter by the logged-in account id directly so own appointments still
      // render even when that account is missing from the bookable staff list.
      if (myAppointmentsOnly && myAccountId) {
        filtered = list.filter((appt) => appt.accountId === myAccountId);
      }
    } else {
      const selected = new Set(resolvedStaffIds);
      filtered = list.filter((appt) => selected.has(appt.accountId));
    }
    return filterOutCancelled(filtered, hideCancelled);
  }, [
    data?.appointments,
    hideCancelled,
    isMobile,
    myAccountId,
    myAppointmentsOnly,
    resolvedStaffIds,
  ]);

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
    setWeekStart(startOfDay(nextStart));
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
    : isMobile && format(weekStart, 'MMM') === format(weekEnd, 'MMM')
      ? `${format(weekStart, 'MMM d')}–${format(weekEnd, 'd')}`
      : isMobile
        ? `${format(weekStart, 'MMM d')}–${format(weekEnd, 'MMM d')}`
        : `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  if (isLoading) return <LoadingState />;

  const calendarToolbar = (
    <>
      <div className="flex w-full min-w-0 shrink-0 flex-nowrap items-center gap-1 overflow-hidden">
        <WeekCalendarNav
          compact
          label={weekNavLabel}
          onPrevious={() => changeWeek(addDays(weekStart, -7))}
          onNext={() => changeWeek(addDays(weekStart, 7))}
        />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {isDayZoomed ? (
            <Button
              variant="outline"
              size={isMobile ? 'icon' : 'sm'}
              onClick={exitDayZoom}
              className={isMobile ? 'h-8 w-8' : 'h-8'}
              aria-label="Full week"
              title="Full week"
            >
              <ZoomOut className="h-3.5 w-3.5" />
              {!isMobile && 'Full week'}
            </Button>
          ) : null}
          {batchCheckoutEnabled && (
            selectMode ? (
              <>
                <Button
                  variant="outline"
                  size={isMobile ? 'icon' : 'sm'}
                  className={isMobile ? 'h-8 w-8' : 'h-8'}
                  onClick={exitSelectMode}
                  aria-label="Cancel selection"
                >
                  <X className="h-3.5 w-3.5" />
                  {!isMobile && 'Cancel'}
                </Button>
                <TrialLockedControl locked={trialExpired}>
                  <Button
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setBatchCheckoutOpen(true)}
                    disabled={trialExpired || selectedItems.length === 0}
                  >
                    {isMobile ? `Out (${selectedItems.length})` : `Check out (${selectedItems.length})`}
                  </Button>
                </TrialLockedControl>
              </>
            ) : (
              <Button
                variant="outline"
                size={isMobile ? 'icon' : 'sm'}
                className={isMobile ? 'h-8 w-8' : 'h-8'}
                onClick={() => setSelectMode(true)}
                aria-label="Select"
                title="Select"
              >
                <ListChecks className="h-3.5 w-3.5" />
                {!isMobile && 'Select'}
              </Button>
            )
          )}
          {permissions.canCreateAppointments && (
            <TrialLockedControl locked={trialExpired}>
              <Button
                size="sm"
                className="h-8 px-2"
                disabled={trialExpired}
                onClick={() => {
                  setCreateDefaultDate(undefined);
                  setCreateDefaultMinutes(undefined);
                  setCreateOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {isMobile ? 'New' : 'New Appointment'}
              </Button>
            </TrialLockedControl>
          )}
          <div className="hidden desktop-shell:block">
            <StaffScheduleFilter
              accounts={staffAccounts}
              selectedIds={resolvedStaffIds}
              onSelectedIdsChange={setSelectedStaffIds}
            />
          </div>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Calendar options">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Filters</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={hideCancelled}
              onCheckedChange={(checked) => setHideCancelled(checked === true)}
              onSelect={(event) => event.preventDefault()}
            >
              Hide cancelled
            </DropdownMenuCheckboxItem>
            {isMobile && (
              <DropdownMenuCheckboxItem
                checked={myAppointmentsOnly}
                onCheckedChange={(checked) => setMyAppointmentsOnly(checked === true)}
                onSelect={(event) => event.preventDefault()}
              >
                My appointments only
              </DropdownMenuCheckboxItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Status colors</DropdownMenuLabel>
            {(Object.keys(APPOINTMENT_CALENDAR_LIP_CLASS) as Array<keyof typeof APPOINTMENT_CALENDAR_LIP_CLASS>)
              .filter((state) => state !== 'cancelled')
              .map((state) => (
                <div
                  key={state}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-stone-700 dark:text-stone-200"
                >
                  <span
                    className={cn('h-1.5 w-6 rounded-full', APPOINTMENT_CALENDAR_LIP_CLASS[state])}
                    aria-hidden
                  />
                  {APPOINTMENT_CALENDAR_LIP_LABEL[state]}
                </div>
              ))}
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {!isDayZoomed && selectedDayKeys.length > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <p className="min-w-0 truncate text-stone-700 dark:text-stone-200">
            {selectedDayKeys.length === 1
              ? '1 day selected'
              : `${selectedDayKeys.length} days selected`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearDaySelection} className="h-8">
              Clear
            </Button>
            <Button
              size="sm"
              className="h-8"
              onClick={() => applyDayZoom(selectedDayKeys)}
            >
              <ZoomIn className="h-3.5 w-3.5" />
              {selectedDayKeys.length === 1 ? 'View day' : `View ${selectedDayKeys.length} days`}
            </Button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div>
      <WeekAppointmentTimeGrid
        toolbar={calendarToolbar}
        days={days}
        appointments={appointments}
        selectedDayKeys={selectedDayKeys}
        zoomedDayKeys={zoomedDayKeys}
        onDayHeaderSelect={handleDayHeaderSelect}
        onDayHeaderRangeSelect={handleDayHeaderRangeSelect}
        onDayHeaderActivate={(dayKey) => applyDayZoom([dayKey])}
        onEmptySlotClick={
          permissions.canCreateAppointments && !selectMode
            ? ({ dayKey, minutes }) => {
                if (trialExpired) {
                  toast.error(TRIAL_LOCKED_MESSAGE);
                  return;
                }
                setCreateDefaultDate(dayKey);
                setCreateDefaultMinutes(minutes);
                setCreateOpen(true);
              }
            : undefined
        }
        renderAppointment={(appt, stack, heightRem) => {
          const customer = customersById[appt.customerId];
          const customerName = customer
            ? `${customer.firstName} ${customer.lastName}`.trim()
            : 'Client';
          const serviceName = servicesById[appt.serviceId]?.name ?? 'Service';
          const account = accountsById[appt.accountId];
          const providerName = account
            ? `${account.firstName} ${account.lastName}`.trim()
            : '';
          const isRecurring =
            !!appt.recurringAppointmentRuleId &&
            activeRecurringRuleIds.has(appt.recurringAppointmentRuleId);
          const checkoutEligible = appt.visitStatus === 'arrived' && appt.paymentStatus === 'unpaid';
          const title = [
            customerName,
            providerName,
            serviceName,
            formatTimeRange(appt.startTime, appt.endTime),
            isRecurring ? 'recurring' : '',
          ]
            .filter(Boolean)
            .join(' — ');

          return (
            <CalendarAppointmentChip
              customerName={customerName}
              serviceName={serviceName}
              visitStatus={appt.visitStatus}
              paymentStatus={appt.paymentStatus}
              isRecurring={isRecurring}
              title={title}
              heightRem={heightRem}
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
        <div className="fixed inset-x-0 bottom-[calc(4rem+var(--safe-area-bottom))] z-50 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95 sm:px-6 desktop-shell:bottom-0">
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
        onOpenChange={(nextOpen) => {
          setCreateOpen(nextOpen);
          if (!nextOpen) {
            setCreateDefaultDate(undefined);
            setCreateDefaultMinutes(undefined);
          }
        }}
        defaultDate={createDefaultDate}
        defaultMinutes={createDefaultMinutes}
      />
    </div>
  );
}
