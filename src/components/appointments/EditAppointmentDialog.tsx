import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { orgApi } from '@/lib/api';
import { customerContactChanged } from '@/lib/customers';
import { formatDateTime, filterFutureAppointmentSlots } from '@/lib/utils';
import type { AppointmentInfo } from '@/types/api';
import { CustomerAutocompleteFields } from '@/components/appointments/CustomerAutocompleteFields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  accountId: z.string().min(1),
  serviceId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  date: z.string().min(1),
  startTime: z.string().min(1),
  appointmentNotes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface EditAppointmentDialogProps {
  orgId: string;
  appointmentInfo: AppointmentInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockStaffMember?: boolean;
  onSuccess?: () => void;
}

function appointmentDateInTimezone(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(iso));
}

export function EditAppointmentDialog({
  orgId,
  appointmentInfo,
  open,
  onOpenChange,
  lockStaffMember = false,
  onSuccess,
}: EditAppointmentDialogProps) {
  const queryClient = useQueryClient();
  const { appointment, customer } = appointmentInfo;
  const timezone = appointment.timezone;
  const skipSlotClearRef = useRef(true);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const accountId = watch('accountId');
  const serviceId = watch('serviceId');
  const date = watch('date');
  const startTime = watch('startTime');
  const firstName = watch('firstName') ?? '';
  const lastName = watch('lastName') ?? '';
  const email = watch('email') ?? '';
  const phone = watch('phone') ?? '';

  useEffect(() => {
    if (!open) {
      skipSlotClearRef.current = true;
      return;
    }

    reset({
      accountId: appointment.accountId,
      serviceId: appointment.serviceId,
      firstName: customer?.firstName ?? '',
      lastName: customer?.lastName ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      date: appointmentDateInTimezone(appointment.startTime, timezone),
      startTime: appointment.startTime,
      appointmentNotes: appointment.appointmentNotes ?? '',
    });
  }, [open, appointment, customer, timezone, reset]);

  useEffect(() => {
    if (!open) return;
    if (skipSlotClearRef.current) {
      skipSlotClearRef.current = false;
      return;
    }
    setValue('startTime', '');
  }, [accountId, serviceId, date, open, setValue]);

  const { data: accountsData } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: open,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services', orgId],
    queryFn: () => orgApi.listServices(orgId),
    enabled: open,
  });

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['availability-slots', orgId, accountId, serviceId, date, 'edit'],
    queryFn: () =>
      orgApi.getAccountAvailability(orgId, accountId, {
        serviceId,
        startDate: date,
        endDate: date,
        timezone,
      }),
    enabled: open && !!accountId && !!serviceId && !!date,
  });

  const slots = useMemo(() => {
    const filtered = filterFutureAppointmentSlots(slotsData?.availableSlots ?? []);
    if (startTime && !filtered.some((slot) => slot.startTime === startTime)) {
      return [{ startTime, endTime: appointment.endTime }, ...filtered];
    }
    return filtered;
  }, [slotsData?.availableSlots, startTime, appointment.endTime]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (customer?.id) {
        const nameChanged =
          data.firstName !== customer.firstName || data.lastName !== customer.lastName;
        if (nameChanged || customerContactChanged(customer, data)) {
          await orgApi.updateCustomer(orgId, customer.id, {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email || null,
            phone: data.phone || null,
          });
        }
      }

      const scheduleChanged =
        data.startTime !== appointment.startTime || data.accountId !== appointment.accountId;
      const serviceChanged = data.serviceId !== appointment.serviceId;
      const notesChanged = (data.appointmentNotes ?? '') !== (appointment.appointmentNotes ?? '');

      if (scheduleChanged) {
        await orgApi.rescheduleAppointment(orgId, appointment.id, {
          accountId: data.accountId,
          startTime: data.startTime,
          timezone,
        });
      }

      if (serviceChanged || notesChanged) {
        await orgApi.updateAppointment(orgId, appointment.id, {
          ...(serviceChanged ? { serviceId: data.serviceId } : {}),
          ...(notesChanged ? { appointmentNotes: data.appointmentNotes ?? null } : {}),
        });
      }
    },
    onSuccess: () => {
      toast.success('Appointment updated');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', appointment.id, 'info'] });
      queryClient.invalidateQueries({ queryKey: ['customers', orgId] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit appointment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Staff member</Label>
              <Select
                value={accountId}
                onValueChange={(value) => setValue('accountId', value)}
                disabled={lockStaffMember}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {accountsData?.accounts
                    .filter((account) => account.isBookable && account.status === 'active')
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.firstName} {account.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service</Label>
              <Select value={serviceId} onValueChange={(value) => setValue('serviceId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {servicesData?.services
                    .filter((service) => service.isActive)
                    .map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {customer ? (
            <CustomerAutocompleteFields
              customers={[]}
              firstName={firstName}
              lastName={lastName}
              email={email}
              phone={phone}
              selectedCustomerId={customer.id}
              onFirstNameChange={(value) => setValue('firstName', value, { shouldValidate: true })}
              onLastNameChange={(value) => setValue('lastName', value, { shouldValidate: true })}
              onEmailChange={(value) => setValue('email', value, { shouldValidate: true })}
              onPhoneChange={(value) => setValue('phone', value)}
              onSelectCustomer={() => undefined}
              onClearSelectedCustomer={() => undefined}
              errors={{
                firstName: errors.firstName?.message,
                lastName: errors.lastName?.message,
                email: errors.email?.message,
              }}
            />
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Date</Label>
              <Input type="date" {...register('date')} />
            </div>
            <div>
              <Label>Available time slot</Label>
              <Select
                value={startTime}
                onValueChange={(value) => setValue('startTime', value)}
                disabled={!accountId || !serviceId || !date || slotsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={slotsLoading ? 'Loading slots…' : 'Select a time slot'} />
                </SelectTrigger>
                <SelectContent>
                  {slots.map((slot) => (
                    <SelectItem key={slot.startTime} value={slot.startTime}>
                      {formatDateTime(slot.startTime)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!slotsLoading && accountId && serviceId && date && slots.length === 0 && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  No open slots on this date. Try another day.
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea {...register('appointmentNotes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !startTime}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

