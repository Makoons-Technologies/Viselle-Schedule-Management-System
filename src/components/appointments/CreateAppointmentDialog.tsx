import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { orgApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
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

const DEFAULT_TIMEZONE = 'America/New_York';

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

interface CreateAppointmentDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export function CreateAppointmentDialog({
  orgId,
  open,
  onOpenChange,
  defaultDate,
}: CreateAppointmentDialogProps) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: defaultDate ?? today },
  });

  const accountId = watch('accountId');
  const serviceId = watch('serviceId');
  const date = watch('date');

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
    queryKey: ['availability-slots', orgId, accountId, serviceId, date],
    queryFn: () =>
      orgApi.getAccountAvailability(orgId, accountId, {
        serviceId,
        startDate: date,
        endDate: date,
        timezone: DEFAULT_TIMEZONE,
      }),
    enabled: open && !!accountId && !!serviceId && !!date,
  });

  const slots = slotsData?.availableSlots ?? [];

  useEffect(() => {
    setValue('startTime', '');
  }, [accountId, serviceId, date, setValue]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      orgApi.createAppointment(orgId, {
        accountId: data.accountId,
        serviceId: data.serviceId,
        customer: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || undefined,
          phone: data.phone,
        },
        startTime: data.startTime,
        timezone: DEFAULT_TIMEZONE,
        appointmentNotes: data.appointmentNotes,
      }),
    onSuccess: () => {
      toast.success('Appointment created');
      queryClient.invalidateQueries({ queryKey: ['appointments', orgId] });
      reset({ date: today });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Staff member</Label>
              <Select value={accountId} onValueChange={(v) => setValue('accountId', v)}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {accountsData?.accounts.filter((a) => a.isBookable && a.status === 'active').map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.accountId && <p className="text-xs text-red-600">Required</p>}
            </div>
            <div>
              <Label>Service</Label>
              <Select value={serviceId} onValueChange={(v) => setValue('serviceId', v)}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {servicesData?.services.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.serviceId && <p className="text-xs text-red-600">Required</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First name</Label><Input {...register('firstName')} /></div>
            <div><Label>Last name</Label><Input {...register('lastName')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Email</Label><Input type="email" {...register('email')} /></div>
            <div><Label>Phone</Label><Input {...register('phone')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" {...register('date')} />
              {errors.date && <p className="text-xs text-red-600">Required</p>}
            </div>
            <div>
              <Label>Available time slot</Label>
              <Select
                value={watch('startTime')}
                onValueChange={(v) => setValue('startTime', v)}
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
              {errors.startTime && <p className="text-xs text-red-600">Select a time slot</p>}
              {!slotsLoading && accountId && serviceId && date && slots.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  No open slots on this date. Try another day or add availability rules for this staff member.
                </p>
              )}
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea {...register('appointmentNotes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || !watch('startTime')}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
