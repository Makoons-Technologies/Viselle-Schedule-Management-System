import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Pencil, Repeat } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { appointmentApi, orgApi } from '@/lib/api';
import { cn, formatLongDate, formatTime } from '@/lib/utils';
import { MakeRecurringDialog } from '@/components/appointments/MakeRecurringDialog';
import { EditRecurringDialog } from '@/components/appointments/EditRecurringDialog';
import { AppointmentCheckoutSheet } from '@/components/appointments/AppointmentCheckoutSheet';
import { SendInvoiceDialog } from '@/components/receipts/SendInvoiceDialog';
import { EditAppointmentDialog } from '@/components/appointments/EditAppointmentDialog';
import { NoteHistoryList } from '@/components/appointments/CustomerServiceNoteHistory';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingState } from '@/components/common/LoadingState';
import { SmsUnderReviewNotice } from '@/components/common/SmsUnderReviewNotice';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { TRIAL_LOCKED_MESSAGE } from '@/lib/trial';
import { isSmsSendingEnabled, SMS_UNDER_REVIEW_NOTICE } from '@/lib/sms';
import { reminderRowLabel, reminderStatusLabel } from '@/lib/reminders';

interface AppointmentDetailSheetProps {
  appointmentId: string | null;
  occurrenceStartTime?: string | null;
  orgId: string;
  onClose: () => void;
}

function visitStatusLabel(status: string) {
  switch (status) {
    case 'scheduled':
      return 'Confirmed';
    case 'arrived':
      return 'Checked in';
    case 'cancelled':
      return 'Cancelled';
    case 'missed':
      return 'Missed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-3.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </dt>
      <dd className="mt-1 text-base font-medium text-stone-900 dark:text-stone-50">{value}</dd>
    </div>
  );
}

const pillOutline =
  'h-10 rounded-full border border-stone-300 bg-transparent px-5 text-sm font-semibold text-stone-900 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800';
const pillPrimary =
  'h-10 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700';

export function AppointmentDetailSheet({
  appointmentId,
  occurrenceStartTime,
  orgId,
  onClose,
}: AppointmentDetailSheetProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { permissions, isManager } = useStaffPermissions(orgId);
  const { plan } = useOrgPlan(orgId);
  const trialExpired = useOrgWriteLocked();
  const smsSendingOn = isSmsSendingEnabled(plan);

  const [recurringOpen, setRecurringOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRecurringOpen, setEditRecurringOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [deleteSeriesOpen, setDeleteSeriesOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [missedConfirmOpen, setMissedConfirmOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  useEffect(() => {
    if (!trialExpired) return;
    setRecurringOpen(false);
    setEditOpen(false);
    setEditRecurringOpen(false);
    setCancelConfirmOpen(false);
    setDeleteSeriesOpen(false);
    setCheckoutOpen(false);
    setMissedConfirmOpen(false);
    setInvoiceOpen(false);
  }, [trialExpired]);

  const occurrenceDateFromProps = occurrenceStartTime?.slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['appointment', appointmentId, 'info', occurrenceDateFromProps],
    queryFn: () => appointmentApi.getInfo(appointmentId!, occurrenceDateFromProps),
    enabled: !!appointmentId,
  });

  const occurrenceMs = occurrenceStartTime ? new Date(occurrenceStartTime).getTime() : Number.NaN;
  const displayStartTime = Number.isNaN(occurrenceMs)
    ? data?.appointment.startTime
    : occurrenceStartTime;

  const displayEndTime = useMemo(() => {
    if (!data?.appointment || !displayStartTime) return null;

    if (!occurrenceStartTime || occurrenceStartTime === data.appointment.startTime) {
      return data.appointment.endTime;
    }

    const startMs = new Date(displayStartTime).getTime();
    const durationMs =
      new Date(data.appointment.endTime).getTime() - new Date(data.appointment.startTime).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(durationMs)) {
      return data.appointment.endTime;
    }

    return new Date(startMs + durationMs).toISOString();
  }, [data?.appointment, displayStartTime, occurrenceStartTime]);

  const occurrenceDate = displayStartTime?.slice(0, 10);
  const isRecurring = !!data?.appointment.recurringAppointmentRuleId;

  const cancelMutation = useMutation({
    mutationFn: (scope?: 'single' | 'future') =>
      orgApi.cancelAppointment(orgId, appointmentId!, {
        scope: isRecurring ? scope : undefined,
        occurrenceDate: isRecurring ? occurrenceDate : undefined,
      }),
    onSuccess: (_result, scope) => {
      toast.success(
        scope === 'single' ? 'Appointment occurrence cancelled' : 'Appointment cancelled',
      );
      queryClient.invalidateQueries({ queryKey: ['appointments', orgId] });
      queryClient.invalidateQueries({ queryKey: ['recurring', orgId] });
      setCancelConfirmOpen(false);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: (ruleId: string) => orgApi.deleteRecurring(orgId, ruleId),
    onSuccess: () => {
      toast.success('Recurring series deleted');
      queryClient.invalidateQueries({ queryKey: ['appointments', orgId] });
      queryClient.invalidateQueries({ queryKey: ['recurring', orgId] });
      setDeleteSeriesOpen(false);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const visitStatusMutation = useMutation({
    mutationFn: (visitStatus: 'arrived' | 'missed') =>
      orgApi.updateAppointmentVisitStatus(orgId, appointmentId!, visitStatus, {
        occurrenceDate: isRecurring ? occurrenceDate : undefined,
      }),
    onSuccess: (_result, visitStatus) => {
      toast.success(visitStatus === 'arrived' ? 'Client checked in' : 'Marked as missed');
      queryClient.invalidateQueries({ queryKey: ['appointments', orgId] });
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId, 'info'] });
      setMissedConfirmOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const undoCheckInMutation = useMutation({
    mutationFn: () =>
      orgApi.undoAppointmentCheckIn(orgId, appointmentId!, {
        occurrenceDate: isRecurring ? occurrenceDate : undefined,
      }),
    onSuccess: () => {
      toast.success('Check-in undone');
      queryClient.invalidateQueries({ queryKey: ['appointments', orgId] });
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId, 'info'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendSmsMutation = useMutation({
    mutationFn: () => orgApi.sendReminder(orgId, appointmentId!, 'sms'),
    onSuccess: () => {
      toast.success('SMS reminder sent');
      queryClient.invalidateQueries({ queryKey: ['reminders', appointmentId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: remindersData } = useQuery({
    queryKey: ['reminders', appointmentId],
    queryFn: () => orgApi.listReminders(orgId, appointmentId!),
    enabled: !!appointmentId,
  });

  const { data: recurringData } = useQuery({
    queryKey: ['recurring', orgId],
    queryFn: () => orgApi.listRecurring(orgId),
    enabled: !!orgId && !!data?.appointment.recurringAppointmentRuleId,
  });

  const recurringRule = recurringData?.recurringAppointmentRules.find(
    (rule) => rule.id === data?.appointment.recurringAppointmentRuleId,
  );

  const recurringSeriesActive = Boolean(
    recurringRule && (recurringRule.status === 'active' || recurringRule.status === 'paused'),
  );

  const canEdit =
    !!data &&
    permissions.canCreateAppointments &&
    data.appointment.visitStatus === 'scheduled' &&
    !data.appointment.recurringAppointmentRuleId &&
    (isManager || data.appointment.accountId === user?.accountId);

  const isCancelled = data?.appointment.visitStatus === 'cancelled';
  const isPast = displayEndTime ? new Date(displayEndTime).getTime() <= Date.now() : false;
  const isUpcoming = !!data && !isCancelled && !isPast && data.appointment.visitStatus === 'scheduled';

  const locationLine = useMemo(() => {
    const org = data?.organization;
    if (!org) return null;
    const parts = [org.address, org.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [data?.organization]);

  const detailHeadline = (() => {
    if (!data) return '';
    if (isCancelled) return 'Appointment cancelled';
    if (data.appointment.visitStatus === 'missed') return 'Missed appointment';
    if (data.appointment.visitStatus === 'arrived') {
      return data.appointment.paymentStatus === 'paid' ? 'Appointment complete' : 'Client checked in';
    }
    if (isPast) return 'Past appointment';
    return 'Looking forward to our appointment';
  })();

  return (
    <>
    <Sheet
      open={!!appointmentId}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          // Nested checkout / edit dialogs live as siblings now, but still ignore
          // dismiss events that fire while those overlays are open.
          if (
            checkoutOpen ||
            invoiceOpen ||
            editOpen ||
            recurringOpen ||
            editRecurringOpen ||
            missedConfirmOpen ||
            cancelConfirmOpen ||
            deleteSeriesOpen
          ) {
            return;
          }
          onClose();
        }
      }}
    >
      <SheetContent
        className="overflow-y-auto sm:max-w-md"
        onPointerDownOutside={(event) => {
          if (
            checkoutOpen ||
            invoiceOpen ||
            editOpen ||
            recurringOpen ||
            editRecurringOpen ||
            missedConfirmOpen ||
            cancelConfirmOpen ||
            deleteSeriesOpen
          ) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (
            checkoutOpen ||
            invoiceOpen ||
            editOpen ||
            recurringOpen ||
            editRecurringOpen ||
            missedConfirmOpen ||
            cancelConfirmOpen ||
            deleteSeriesOpen
          ) {
            event.preventDefault();
          }
        }}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Appointment details</SheetTitle>
          <SheetDescription>View and manage appointment information</SheetDescription>
        </SheetHeader>

        {isLoading && <LoadingState />}

        {data && displayStartTime && displayEndTime && (
          <div className="pb-6">
            <div className={cn('mb-6 text-center', isUpcoming && 'pt-2')}>
              {isUpcoming && (
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-brand-600 dark:text-brand-400" />
              )}
              <h2 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                {detailHeadline}
              </h2>
              {isUpcoming && (
                <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
                  Please see your details below.
                </p>
              )}
            </div>

            <dl className="divide-y divide-stone-200 dark:divide-stone-700/80">
              <DetailRow label="Status" value={visitStatusLabel(data.appointment.visitStatus)} />
              <DetailRow label="Date" value={formatLongDate(displayStartTime)} />
              <DetailRow
                label="Time"
                value={`${formatTime(displayStartTime)} – ${formatTime(displayEndTime)}`}
              />
              <DetailRow label="Service" value={data.service?.name ?? '—'} />
              <DetailRow
                label="Professional"
                value={
                  data.account ? `${data.account.firstName} ${data.account.lastName}` : '—'
                }
              />
              <DetailRow
                label="Customer"
                value={
                  data.customer ? (
                    <span className="block">
                      <span className="block">
                        {data.customer.firstName} {data.customer.lastName}
                      </span>
                      {data.customer.email && (
                        <span className="mt-0.5 block text-sm font-normal text-stone-500 dark:text-stone-400">
                          {data.customer.email}
                        </span>
                      )}
                      {data.customer.phone && (
                        <span className="mt-0.5 block text-sm font-normal text-stone-500 dark:text-stone-400">
                          {data.customer.phone}
                        </span>
                      )}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              {locationLine && <DetailRow label="Location" value={locationLine} />}
              {data.appointment.visitStatus === 'arrived' && (
                <DetailRow
                  label="Payment"
                  value={
                    data.appointment.paymentStatus.charAt(0).toUpperCase() +
                    data.appointment.paymentStatus.slice(1)
                  }
                />
              )}
              {data.appointment.appointmentNotes && (
                <DetailRow label="Notes" value={data.appointment.appointmentNotes} />
              )}
              {recurringSeriesActive && (
                <DetailRow label="Series" value="Part of a recurring series" />
              )}
            </dl>

            {data.customerServiceNotes && data.customerServiceNotes.length > 0 && (
              <div className="mt-5">
                <NoteHistoryList notes={data.customerServiceNotes} />
              </div>
            )}

            {remindersData && remindersData.reminders.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
                  Reminders
                </p>
                {!smsSendingOn && remindersData.reminders.some((r) => r.type === 'sms') && (
                  <SmsUnderReviewNotice className="mb-2" />
                )}
                <ul className="divide-y divide-stone-200 dark:divide-stone-700/80">
                  {remindersData.reminders.map((r) => {
                    const statusLabel = reminderStatusLabel(r, smsSendingOn);
                    return (
                      <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <span className="text-stone-900 dark:text-stone-100">{reminderRowLabel(r)}</span>
                        <Badge
                          variant={
                            statusLabel === 'sent'
                              ? 'success'
                              : statusLabel === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {statusLabel}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
                {remindersData.reminders.some((r) => r.type === 'push') && (
                  <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                    Push status means the notification was accepted by the browser push service, not
                    that it reached the device.
                  </p>
                )}
              </div>
            )}

            {trialExpired ? (
              <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {TRIAL_LOCKED_MESSAGE}
              </p>
            ) : (
              <>
                {data.appointment.visitStatus !== 'cancelled' && (
                  <div className="mt-6 flex flex-col gap-2.5">
                    {permissions.canManageVisitPayment && data.appointment.visitStatus === 'scheduled' && (
                      <div className="flex flex-col gap-2.5 sm:flex-row">
                        <Button
                          className={cn(pillPrimary, 'w-full sm:flex-1')}
                          onClick={() => visitStatusMutation.mutate('arrived')}
                          disabled={visitStatusMutation.isPending}
                        >
                          Check in
                        </Button>
                        <Button
                          variant="outline"
                          className={cn(pillOutline, 'w-full sm:flex-1')}
                          onClick={() => setMissedConfirmOpen(true)}
                          disabled={visitStatusMutation.isPending}
                        >
                          Mark missed
                        </Button>
                      </div>
                    )}

                    {permissions.canManageVisitPayment &&
                      data.appointment.visitStatus === 'arrived' &&
                      data.appointment.paymentStatus === 'unpaid' && (
                        <div className="flex flex-col gap-2.5 sm:flex-row">
                          <Button
                            className={cn(pillPrimary, 'w-full sm:flex-1')}
                            onClick={() => setCheckoutOpen(true)}
                          >
                            Checkout
                          </Button>
                          <Button
                            variant="outline"
                            className={cn(pillOutline, 'w-full sm:flex-1')}
                            onClick={() => undoCheckInMutation.mutate()}
                            disabled={undoCheckInMutation.isPending}
                          >
                            Undo check-in
                          </Button>
                        </div>
                      )}

                    <div className="flex flex-wrap gap-2">
                      {!recurringSeriesActive && (
                        <Button
                          variant="outline"
                          className={pillOutline}
                          onClick={() => setRecurringOpen(true)}
                        >
                          <Repeat className="h-4 w-4" /> Make recurring
                        </Button>
                      )}

                      {data.appointment.recurringAppointmentRuleId &&
                        recurringRule &&
                        recurringSeriesActive && (
                          <Button
                            variant="outline"
                            className={pillOutline}
                            onClick={() => setEditRecurringOpen(true)}
                          >
                            <Repeat className="h-4 w-4" /> Edit series
                          </Button>
                        )}

                      {data.appointment.recurringAppointmentRuleId && recurringRule && (
                        <Button
                          variant="outline"
                          className={cn(
                            pillOutline,
                            'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40',
                          )}
                          onClick={() => setDeleteSeriesOpen(true)}
                          disabled={deleteSeriesMutation.isPending}
                        >
                          Delete series
                        </Button>
                      )}

                      {permissions.canManageVisitPayment && (
                          <Button
                            variant="outline"
                            className={pillOutline}
                            onClick={() => setInvoiceOpen(true)}
                          >
                            {data.appointment.paymentStatus === 'paid' ? 'Send receipt' : 'Send invoice'}
                          </Button>
                        )}

                      <Button
                        variant="outline"
                        className={pillOutline}
                        onClick={() => sendSmsMutation.mutate()}
                        disabled={
                          sendSmsMutation.isPending ||
                          !smsSendingOn ||
                          !data.customer?.phone?.trim()
                        }
                        title={
                          !smsSendingOn
                            ? SMS_UNDER_REVIEW_NOTICE
                            : data.customer?.phone?.trim()
                              ? undefined
                              : 'Add a phone number for this customer to send SMS'
                        }
                      >
                        Send SMS
                      </Button>
                    </div>
                  </div>
                )}

                {(canEdit || permissions.canCancelAppointments) &&
                  data.appointment.visitStatus !== 'cancelled' && (
                    <div className="mt-8 space-y-3 text-center">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setEditOpen(true)}
                          className="block w-full text-sm font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit appointment
                          </span>
                        </button>
                      )}
                      {permissions.canCancelAppointments && (
                        <button
                          type="button"
                          onClick={() => setCancelConfirmOpen(true)}
                          disabled={cancelMutation.isPending}
                          className="block w-full text-sm font-semibold text-stone-500 underline-offset-2 hover:underline dark:text-stone-400"
                        >
                          Cancel appointment
                        </button>
                      )}
                    </div>
                  )}
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>

    {appointmentId && data && (
      <>
        <AppointmentCheckoutSheet
          orgId={orgId}
          appointmentInfo={data}
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['appointments', orgId] });
            queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId, 'info'] });
          }}
        />
        <SendInvoiceDialog
          orgId={orgId}
          appointmentId={data.appointment.id}
          open={invoiceOpen}
          status={data.appointment.paymentStatus === 'paid' ? 'paid' : 'unpaid'}
          customerEmail={data.customer?.email}
          customerPhone={data.customer?.phone}
          onOpenChange={setInvoiceOpen}
        />
        <EditAppointmentDialog
          orgId={orgId}
          appointmentInfo={data}
          open={editOpen}
          onOpenChange={setEditOpen}
          lockStaffMember={!isManager}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['appointments', orgId] });
            queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId, 'info'] });
          }}
        />
        <MakeRecurringDialog
          orgId={orgId}
          appointmentId={appointmentId}
          appointmentStartTime={displayStartTime ?? data.appointment.startTime}
          accountId={data.appointment.accountId}
          serviceId={data.appointment.serviceId}
          timezone={data.appointment.timezone}
          open={recurringOpen}
          onOpenChange={setRecurringOpen}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId, 'info'] })
          }
        />
        <EditRecurringDialog
          orgId={orgId}
          rule={recurringRule ?? null}
          open={editRecurringOpen}
          onOpenChange={setEditRecurringOpen}
        />
      </>
    )}

    <ConfirmDialog
      open={missedConfirmOpen}
      onOpenChange={setMissedConfirmOpen}
      title="Mark as missed?"
      description="This client did not show up for their appointment."
      confirmLabel="Mark missed"
      destructive
      loading={visitStatusMutation.isPending}
      onConfirm={() => visitStatusMutation.mutate('missed')}
    />

    <ConfirmDialog
      open={cancelConfirmOpen}
      onOpenChange={setCancelConfirmOpen}
      title="Cancel appointment?"
      description={
        isRecurring && recurringSeriesActive
          ? 'Only this occurrence will be cancelled. Use Delete Series to remove the entire recurring schedule.'
          : 'This appointment will be marked as cancelled and any pending reminders will be stopped. This action cannot be undone.'
      }
      confirmLabel="Cancel Appointment"
      destructive
      loading={cancelMutation.isPending}
      onConfirm={() =>
        cancelMutation.mutate(isRecurring && recurringSeriesActive ? 'single' : undefined)
      }
    />

    <ConfirmDialog
      open={deleteSeriesOpen}
      onOpenChange={setDeleteSeriesOpen}
      title="Delete recurring series?"
      description="This permanently removes the recurring rule and cancels all linked appointments. This cannot be undone."
      confirmLabel="Delete Series"
      destructive
      loading={deleteSeriesMutation.isPending}
      onConfirm={() => recurringRule && deleteSeriesMutation.mutate(recurringRule.id)}
    />
    </>
  );
}
