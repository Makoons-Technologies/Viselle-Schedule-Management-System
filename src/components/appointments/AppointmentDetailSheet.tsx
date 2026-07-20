import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Repeat } from 'lucide-react';

import { useMemo, useState } from 'react';

import { toast } from 'sonner';

import { appointmentApi, orgApi } from '@/lib/api';

import { formatDateTime } from '@/lib/utils';

import { MakeRecurringDialog } from '@/components/appointments/MakeRecurringDialog';
import { EditRecurringDialog } from '@/components/appointments/EditRecurringDialog';
import { AppointmentCheckoutSheet } from '@/components/appointments/AppointmentCheckoutSheet';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';

import { AppointmentStatusBadge } from '@/components/common/StatusBadge';

import { LoadingState } from '@/components/common/LoadingState';

import { Button } from '@/components/ui/button';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { Badge } from '@/components/ui/badge';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';



interface AppointmentDetailSheetProps {

  appointmentId: string | null;

  occurrenceStartTime?: string | null;

  orgId: string;

  onClose: () => void;

}



export function AppointmentDetailSheet({

  appointmentId,

  occurrenceStartTime,

  orgId,

  onClose,

}: AppointmentDetailSheetProps) {

  const queryClient = useQueryClient();
  const { permissions } = useStaffPermissions(orgId);

  const [recurringOpen, setRecurringOpen] = useState(false);

  const [editRecurringOpen, setEditRecurringOpen] = useState(false);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [deleteSeriesOpen, setDeleteSeriesOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [missedConfirmOpen, setMissedConfirmOpen] = useState(false);



  const occurrenceDateFromProps = occurrenceStartTime?.slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['appointment', appointmentId, 'info', occurrenceDateFromProps],
    queryFn: () =>
      appointmentApi.getInfo(appointmentId!, occurrenceDateFromProps),
    enabled: !!appointmentId,
  });

  const displayStartTime = occurrenceStartTime ?? data?.appointment.startTime;

  const displayEndTime = useMemo(() => {
    if (!data?.appointment || !displayStartTime) return null;

    if (!occurrenceStartTime || occurrenceStartTime === data.appointment.startTime) {
      return data.appointment.endTime;
    }

    const durationMs =
      new Date(data.appointment.endTime).getTime() - new Date(data.appointment.startTime).getTime();

    return new Date(new Date(displayStartTime).getTime() + durationMs).toISOString();
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



  const handleCancelClick = () => setCancelConfirmOpen(true);



  return (

    <Sheet open={!!appointmentId} onOpenChange={(open) => !open && onClose()}>

      <SheetContent className="overflow-y-auto">

        <SheetHeader>

          <SheetTitle>Appointment Details</SheetTitle>

          <SheetDescription>View and manage appointment information</SheetDescription>

        </SheetHeader>

        {isLoading && <LoadingState />}

        {data && displayStartTime && displayEndTime && (

          <div className="space-y-6">

            <div className="flex items-center gap-2">

              <AppointmentStatusBadge
                visitStatus={data.appointment.visitStatus}
                paymentStatus={data.appointment.paymentStatus}
                recurringAppointmentRuleId={data.appointment.recurringAppointmentRuleId}
                recurringSeriesActive={recurringSeriesActive}
              />

              <span className="text-sm text-stone-500">{data.appointment.timezone}</span>

            </div>

            <div className="space-y-3 text-sm">

              <div>

                <p className="font-medium text-stone-500">When</p>

                <p>{formatDateTime(displayStartTime)} – {formatDateTime(displayEndTime)}</p>

              </div>

              <div>

                <p className="font-medium text-stone-500">Customer</p>

                <p>{data.customer ? `${data.customer.firstName} ${data.customer.lastName}` : '—'}</p>

                {data.customer?.email && <p className="text-stone-500">{data.customer.email}</p>}
                {data.customer?.phone && <p className="text-stone-500">{data.customer.phone}</p>}

              </div>

              <div>

                <p className="font-medium text-stone-500">Staff</p>

                <p>{data.account ? `${data.account.firstName} ${data.account.lastName}` : '—'}</p>

              </div>

              <div>

                <p className="font-medium text-stone-500">Service</p>

                <p>{data.service?.name ?? '—'}</p>

              </div>

              {data.appointment.appointmentNotes && (

                <div>

                  <p className="font-medium text-stone-500">Notes</p>

                  <p>{data.appointment.appointmentNotes}</p>

                </div>

              )}

            </div>

            {remindersData && remindersData.reminders.length > 0 && (

              <div>

                <p className="mb-2 text-sm font-medium text-stone-500">Reminders</p>

                <div className="space-y-2">

                  {remindersData.reminders.map((r) => (

                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm">

                      <span className="capitalize">{r.type}</span>

                      <Badge variant={r.status === 'sent' ? 'success' : 'secondary'}>{r.status}</Badge>

                    </div>

                  ))}

                </div>

              </div>

            )}

            <div className="flex flex-wrap gap-2">
              {permissions.canManageVisitPayment && data.appointment.visitStatus === 'scheduled' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => visitStatusMutation.mutate('arrived')}
                    disabled={visitStatusMutation.isPending}
                  >
                    Check in
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMissedConfirmOpen(true)}
                    disabled={visitStatusMutation.isPending}
                  >
                    Mark missed
                  </Button>
                </>
              )}

              {permissions.canManageVisitPayment &&
                data.appointment.visitStatus === 'arrived' &&
                data.appointment.paymentStatus === 'unpaid' && (
                <>
                  <Button size="sm" onClick={() => setCheckoutOpen(true)}>
                    Checkout
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => undoCheckInMutation.mutate()}
                    disabled={undoCheckInMutation.isPending}
                  >
                    Undo check-in
                  </Button>
                </>
              )}

              {data.appointment.visitStatus !== 'cancelled' && (
                <>
                  {!recurringSeriesActive && (
                    <Button variant="outline" size="sm" onClick={() => setRecurringOpen(true)}>
                      <Repeat className="h-4 w-4" /> Make Recurring
                    </Button>
                  )}

                  {data.appointment.recurringAppointmentRuleId && recurringRule && recurringSeriesActive && (
                    <Button variant="outline" size="sm" onClick={() => setEditRecurringOpen(true)}>
                      <Repeat className="h-4 w-4" /> Edit Series
                    </Button>
                  )}

                  {data.appointment.recurringAppointmentRuleId && recurringRule && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-700 hover:bg-red-50 hover:text-red-800"
                      onClick={() => setDeleteSeriesOpen(true)}
                      disabled={deleteSeriesMutation.isPending}
                    >
                      Delete Series
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendSmsMutation.mutate()}
                    disabled={sendSmsMutation.isPending || !data.customer?.phone?.trim()}
                    title={
                      data.customer?.phone?.trim()
                        ? undefined
                        : 'Add a phone number for this customer to send SMS'
                    }
                  >
                    Send SMS
                  </Button>

                  {permissions.canCancelAppointments && (
                    <Button variant="destructive" size="sm" onClick={handleCancelClick} disabled={cancelMutation.isPending}>
                      Cancel
                    </Button>
                  )}
                </>
              )}

              {data.appointment.recurringAppointmentRuleId && recurringSeriesActive && (

                <Badge variant="secondary">Part of recurring series</Badge>

              )}

            </div>

          </div>

        )}

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
            <MakeRecurringDialog

              orgId={orgId}

              appointmentId={appointmentId}

              appointmentStartTime={displayStartTime ?? data.appointment.startTime}

              accountId={data.appointment.accountId}

              serviceId={data.appointment.serviceId}

              timezone={data.appointment.timezone}

              open={recurringOpen}

              onOpenChange={setRecurringOpen}

              onSuccess={() => queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId, 'info'] })}

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

      </SheetContent>

    </Sheet>

  );

}


