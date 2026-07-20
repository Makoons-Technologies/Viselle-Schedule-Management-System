import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { orgApi } from '@/lib/api';
import {
  customerContactChanged,
  customerDisplayName,
  findExistingCustomerMatch,
} from '@/lib/customers';
import { formatDateTime, getDayOfWeekFromIso, todayDateOnlyLocal, filterFutureAppointmentSlots } from '@/lib/utils';
import type { Customer, RecurringFrequency } from '@/types/api';
import { CustomerAutocompleteFields } from '@/components/appointments/CustomerAutocompleteFields';
import { RecurringOptionsFields } from '@/components/appointments/RecurringOptionsFields';
import {
  dayTimesToApiPayload,
  defaultTimeFromIso,
  isRecurringOptionsValid,
  recurringIntervalForFrequency,
} from '@/components/appointments/recurring-options';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { helperTextClass } from '@/components/common/Panel';
import { useRecurringDaySchedule } from '@/hooks/useRecurringDaySchedule';
import { useOrgPlan } from '@/hooks/useOrgPlan';
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
import { Switch } from '@/components/ui/switch';
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

interface PendingSubmit {
  data: FormData;
  recurringDays: number[];
  recurringDayTimes: Record<string, string>;
  withRecurring: boolean;
}

interface MergeConfirmState {
  customer: Customer;
  matchedBy: 'email' | 'phone';
  pending: PendingSubmit;
}

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
  const { plan } = useOrgPlan(orgId);
  const today = todayDateOnlyLocal();
  const initialDate =
    defaultDate && defaultDate >= today ? defaultDate : today;

  const [makeRecurring, setMakeRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('weekly');
  const [customInterval, setCustomInterval] = useState('3');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [mergeConfirm, setMergeConfirm] = useState<MergeConfirmState | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: initialDate },
  });

  const accountId = watch('accountId');
  const serviceId = watch('serviceId');
  const date = watch('date');
  const startTime = watch('startTime');
  const firstName = watch('firstName') ?? '';
  const lastName = watch('lastName') ?? '';
  const email = watch('email') ?? '';
  const phone = watch('phone') ?? '';

  const defaultRecurringTime = startTime ? defaultTimeFromIso(startTime) : '09:00';
  const {
    selectedDays,
    dayTimes,
    resetSchedule,
    toggleDay,
    setDayTime,
    dayConflicts,
    hasConflicts,
    slotsLoading: recurringSlotsLoading,
  } = useRecurringDaySchedule({
    orgId,
    accountId,
    serviceId,
    timezone: DEFAULT_TIMEZONE,
    fallbackTime: defaultRecurringTime,
    enabled: open && makeRecurring,
  });

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

  const { data: customersData } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: open,
  });

  const customers = customersData?.customers ?? [];

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

  const slots = useMemo(
    () => filterFutureAppointmentSlots(slotsData?.availableSlots ?? []),
    [slotsData?.availableSlots],
  );

  useEffect(() => {
    if (date && date < today) {
      setValue('date', today);
    }
  }, [date, today, setValue]);

  useEffect(() => {
    setValue('startTime', '');
  }, [accountId, serviceId, date, setValue]);

  useEffect(() => {
    if (!open) return;
    recurringAnchorRef.current = null;
    setMakeRecurring(false);
    setFrequency('weekly');
    setCustomInterval('3');
    setEndDate('');
    setSelectedCustomerId(null);
    setMergeConfirm(null);
    resetSchedule([], {});
  }, [open, resetSchedule]);

  const recurringAnchorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!makeRecurring) {
      recurringAnchorRef.current = null;
      return;
    }

    const anchor = startTime || date;
    if (!anchor || recurringAnchorRef.current === anchor) return;
    recurringAnchorRef.current = anchor;

    if (startTime) {
      const day = getDayOfWeekFromIso(startTime);
      const time = defaultTimeFromIso(startTime);
      resetSchedule([day], { [day]: time }, time);
      return;
    }

    const [year, month, dayNum] = date.split('-').map(Number);
    const day = new Date(Date.UTC(year, month - 1, dayNum)).getUTCDay();
    resetSchedule([day], { [day]: defaultRecurringTime }, defaultRecurringTime);
  }, [makeRecurring, startTime, date, defaultRecurringTime, resetSchedule]);

  const mutation = useMutation({
    mutationFn: async ({
      data,
      recurringDays,
      recurringDayTimes,
      withRecurring,
      customerId,
    }: PendingSubmit & { customerId?: string }) => {
      if (customerId) {
        await orgApi.updateCustomer(orgId, customerId, {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || null,
          phone: data.phone || null,
        });
      }

      const created = await orgApi.createAppointment(orgId, {
        accountId: data.accountId,
        serviceId: data.serviceId,
        ...(customerId
          ? { customerId }
          : {
              customer: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email || undefined,
                phone: data.phone,
              },
            }),
        startTime: data.startTime,
        timezone: DEFAULT_TIMEZONE,
        appointmentNotes: data.appointmentNotes,
      });

      if (withRecurring) {
        return orgApi.makeAppointmentRecurring(orgId, created.appointment.id, {
          frequency,
          interval: recurringIntervalForFrequency(frequency, customInterval),
          endDate: endDate || undefined,
          daysOfWeek: recurringDays,
          dayTimes: recurringDayTimes,
        });
      }

      return { createdAppointments: [created.appointment] };
    },
    onSuccess: (_result, variables) => {
      if (variables.withRecurring) {
        toast.success('Recurring appointment created');
        queryClient.invalidateQueries({ queryKey: ['recurring', orgId] });
      } else {
        toast.success('Appointment created');
      }
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['customers', orgId] });
      reset({ date: today });
      setSelectedCustomerId(null);
      setMergeConfirm(null);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submitAppointment = (pending: PendingSubmit, customerId?: string) => {
    mutation.mutate({ ...pending, customerId });
  };

  const handleCreate = (pending: PendingSubmit) => {
    const match = findExistingCustomerMatch(customers, {
      email: pending.data.email,
      phone: pending.data.phone,
    });

    // Reuse existing customer silently when contact details match.
    // Only ask to update when the form would change their on-file data.
    if (match) {
      if (customerContactChanged(match.customer, pending.data)) {
        setMergeConfirm({
          customer: match.customer,
          matchedBy: match.matchedBy,
          pending,
        });
        return;
      }
      submitAppointment(pending, match.customer.id);
      return;
    }

    if (selectedCustomerId) {
      submitAppointment(pending, selectedCustomerId);
      return;
    }

    submitAppointment(pending);
  };

  const recurringValid =
    !makeRecurring ||
    (isRecurringOptionsValid(frequency, customInterval, selectedDays, dayTimes) &&
      !hasConflicts &&
      !recurringSlotsLoading);
  const canSubmit = !!startTime && recurringValid;

  const handleSelectCustomer = (customer: Customer) => {
    setValue('firstName', customer.firstName);
    setValue('lastName', customer.lastName);
    setValue('email', customer.email ?? '');
    setValue('phone', customer.phone ?? '');
    setSelectedCustomerId(customer.id);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((data) =>
              handleCreate({
                data,
                recurringDays: selectedDays,
                recurringDayTimes: dayTimesToApiPayload(dayTimes, selectedDays),
                withRecurring: makeRecurring,
              }),
            )}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                {errors.accountId && <p className="text-xs text-red-600 dark:text-red-400">Required</p>}
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
                {errors.serviceId && <p className="text-xs text-red-600 dark:text-red-400">Required</p>}
              </div>
            </div>

            <CustomerAutocompleteFields
              customers={customers}
              firstName={firstName}
              lastName={lastName}
              email={email}
              phone={phone}
              selectedCustomerId={selectedCustomerId}
              onFirstNameChange={(value) => setValue('firstName', value, { shouldValidate: true })}
              onLastNameChange={(value) => setValue('lastName', value, { shouldValidate: true })}
              onEmailChange={(value) => setValue('email', value, { shouldValidate: true })}
              onPhoneChange={(value) => setValue('phone', value)}
              onSelectCustomer={handleSelectCustomer}
              onClearSelectedCustomer={() => setSelectedCustomerId(null)}
              errors={{
                firstName: errors.firstName?.message,
                lastName: errors.lastName?.message,
                email: errors.email?.message,
              }}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Date</Label>
                <Input type="date" min={today} {...register('date')} />
                {errors.date && <p className="text-xs text-red-600 dark:text-red-400">Required</p>}
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
                {errors.startTime && <p className="text-xs text-red-600 dark:text-red-400">Select a time slot</p>}
                {!slotsLoading && accountId && serviceId && date && slots.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    No open slots on this date. Try another day or add availability rules for this staff member.
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea {...register('appointmentNotes')} />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-stone-200 px-3 py-3 dark:border-stone-700 dark:bg-stone-800/40">
              <div className="min-w-0 flex-1">
                <Label>Make recurring</Label>
                {!makeRecurring && (
                  <p className={helperTextClass}>
                    {plan && !plan.recurringAppointmentsEnabled
                      ? 'Upgrade to Professional or Business to schedule repeating appointments.'
                      : 'Generate future appointments on a repeating schedule.'}
                  </p>
                )}
              </div>
              <Switch
                checked={makeRecurring}
                onCheckedChange={setMakeRecurring}
                disabled={plan ? !plan.recurringAppointmentsEnabled : false}
                aria-label="Make recurring"
              />
            </div>
            {makeRecurring && plan?.recurringAppointmentsEnabled && (
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
                dayTimes={dayTimes}
                onDayTimeChange={setDayTime}
                dayConflicts={dayConflicts}
                defaultTime={defaultRecurringTime}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !canSubmit}
                className="disabled:bg-brand-600/40 disabled:text-white disabled:opacity-100"
              >
                {makeRecurring ? 'Create Series' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!mergeConfirm}
        onOpenChange={(nextOpen) => !nextOpen && setMergeConfirm(null)}
        title="Update existing customer?"
        description={
          mergeConfirm
            ? `This ${mergeConfirm.matchedBy} is already on file for ${customerDisplayName(mergeConfirm.customer)}. Update their contact info and schedule under this customer?`
            : ''
        }
        confirmLabel="Update & Schedule"
        loading={mutation.isPending}
        onConfirm={() => {
          if (!mergeConfirm) return;
          submitAppointment(mergeConfirm.pending, mergeConfirm.customer.id);
          setMergeConfirm(null);
        }}
      />
    </>
  );
}
