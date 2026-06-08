import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Repeat } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { appointmentApi, orgApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { MakeRecurringDialog } from '@/components/appointments/MakeRecurringDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { AppointmentStatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

interface AppointmentDetailSheetProps {
  appointmentId: string | null;
  orgId: string;
  onClose: () => void;
}

export function AppointmentDetailSheet({ appointmentId, orgId, onClose }: AppointmentDetailSheetProps) {
  const queryClient = useQueryClient();
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['appointment', appointmentId, 'info'],
    queryFn: () => appointmentApi.getInfo(appointmentId!),
    enabled: !!appointmentId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => orgApi.cancelAppointment(orgId, appointmentId!),
    onSuccess: () => {
      toast.success('Appointment cancelled');
      queryClient.invalidateQueries({ queryKey: ['appointments', orgId] });
      setCancelConfirmOpen(false);
      onClose();
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

  return (
    <Sheet open={!!appointmentId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Appointment Details</SheetTitle>
          <SheetDescription>View and manage appointment information</SheetDescription>
        </SheetHeader>
        {isLoading && <LoadingState />}
        {data && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <AppointmentStatusBadge status={data.appointment.status} />
              <span className="text-sm text-stone-500">{data.appointment.timezone}</span>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-stone-500">When</p>
                <p>{formatDateTime(data.appointment.startTime)} – {formatDateTime(data.appointment.endTime)}</p>
              </div>
              <div>
                <p className="font-medium text-stone-500">Customer</p>
                <p>{data.customer ? `${data.customer.firstName} ${data.customer.lastName}` : '—'}</p>
                {data.customer?.email && <p className="text-stone-500">{data.customer.email}</p>}
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
              {data.appointment.status !== 'cancelled' && (
                <>
                  {!data.appointment.recurringAppointmentRuleId && (
                    <Button variant="outline" size="sm" onClick={() => setRecurringOpen(true)}>
                      <Repeat className="h-4 w-4" /> Make Recurring
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => sendSmsMutation.mutate()} disabled={sendSmsMutation.isPending}>
                    Send SMS
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setCancelConfirmOpen(true)} disabled={cancelMutation.isPending}>
                    Cancel
                  </Button>
                </>
              )}
              {data.appointment.recurringAppointmentRuleId && (
                <Badge variant="secondary">Part of recurring series</Badge>
              )}
            </div>
          </div>
        )}
        {appointmentId && (
          <MakeRecurringDialog
            orgId={orgId}
            appointmentId={appointmentId}
            open={recurringOpen}
            onOpenChange={setRecurringOpen}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId, 'info'] })}
          />
        )}
        <ConfirmDialog
          open={cancelConfirmOpen}
          onOpenChange={setCancelConfirmOpen}
          title="Cancel appointment?"
          description="This appointment will be marked as cancelled and any pending reminders will be stopped. This action cannot be undone."
          confirmLabel="Cancel Appointment"
          destructive
          loading={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate()}
        />
      </SheetContent>
    </Sheet>
  );
}
