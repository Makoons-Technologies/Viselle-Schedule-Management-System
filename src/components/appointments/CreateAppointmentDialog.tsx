import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { orgApi } from '@/lib/api';
import { formatDateTime, getDayOfWeekFromIso } from '@/lib/utils';
import type { RecurringFrequency } from '@/types/api';
import { RecurringOptionsFields } from '@/components/appointments/RecurringOptionsFields';
import {
  isRecurringOptionsValid,
  recurringIntervalForFrequency,
} from '@/components/appointments/recurring-options';
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

  const [makeRecurring, setMakeRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('weekly');
  const [customInterval, setCustomInterval] = useState('3');
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: defaultDate ?? today },
  });

  const accountId = watch('accountId');
  const serviceId = watch('serviceId');
  const date = watch('date');
  const startTime = watch('startTime');

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

  useEffect(() => {
    if (!open) return;
    setMakeRecurring(false);
    setFrequency('weekly');
    setCustomInterval('3');
    setEndDate('');
    setSelectedDays([]);
  }, [open]);

  useEffect(() => {
    if (!makeRecurring) return;
    if (startTime) {
      setSelectedDays([getDayOfWeekFromIso(startTime)]);
      return;
    }
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      setSelectedDays([new Date(Date.UTC(year, month - 1, day)).getUTCDay()]);
    }
  }, [makeRecurring, startTime, date]);

  const toggleDay = (day: number) => {
    setSelectedDays((current) => {
      if (current.includes(day)) {
        if (current.length === 1) return current;
        return current.filter((value) => value !== day);
      }
      return [...current, day].sort((a, b) => a - b);
    });
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const created = await orgApi.createAppointment(orgId, {
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
      });

      if (makeRecurring) {
        return orgApi.makeAppointmentRecurring(orgId, created.appointment.id, {
          frequency,
          interval: recurringIntervalForFrequency(frequency, customInterval),
          endDate: endDate || undefined,
          daysOfWeek: selectedDays,
        });
      }

      return { createdAppointments: [created.appointment] };
    },
    onSuccess: (result) => {
      if (makeRecurring) {
        const total = result.createdAppointments.length;
        const extra = total - 1;
        toast.success(
          extra > 0
            ? `Recurring series created with ${total} appointments`
            : 'Appointment created; no additional recurring slots could be booked',
        );
        queryClient.invalidateQueries({ queryKey: ['recurring', orgId] });
      } else {
        toast.success('Appointment created');
      }
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      reset({ date: today });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const recurringValid = !makeRecurring || isRecurringOptionsValid(frequency, customInterval, selectedDays);
  const canSubmit = !!startTime && recurringValid;

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
                value={startTime}
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
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
              checked={makeRecurring}
              onChange={(e) => setMakeRecurring(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-stone-900">Make recurring</span>
              <span className="block text-xs text-stone-500">
                Generate future appointments on a repeating schedule.
              </span>
            </span>
          </label>
          {makeRecurring && (
            <RecurringOptionsFields
              compact
              frequency={frequency}
              onFrequencyChange={setFrequency}
              customInterval={customInterval}
              onCustomIntervalChange={setCustomInterval}
              endDate={endDate}
              onEndDateChange={setEndDate}
              selectedDays={selectedDays}
              onToggleDay={toggleDay}
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || !canSubmit}>
              {makeRecurring ? 'Create Series' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
