import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ApiError, getApiErrorMessage, orgApi } from '@/lib/api';
import {
  customerContactChanged,
  customerDisplayName,
  findExistingCustomerMatch,
  getCustomerFieldChanges,
} from '@/lib/customers';
import { formatDateTime, walkInStartTimeIso } from '@/lib/utils';
import { TRIAL_LOCKED_MESSAGE } from '@/lib/trial';
import type { Appointment, Customer } from '@/types/api';
import { CreateAppointmentCustomerStep } from '@/components/appointments/CreateAppointmentCustomerStep';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CustomerFieldChangesList } from '@/components/customers/CustomerFieldChangesList';
import { helperTextClass } from '@/components/common/Panel';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { isSmsSendingEnabled, isStagingApp, SMS_UNDER_REVIEW_OPT_IN_NOTE } from '@/lib/sms';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEFAULT_TIMEZONE = 'America/New_York';

const schema = z.object({
  accountId: z.string().min(1),
  serviceId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface WalkInDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill staff — typically the signed-in user's account. */
  defaultAccountId?: string | null;
  /** Called with the created walk-in so the calendar can focus it. */
  onCreated?: (appointments: Appointment[]) => void;
}

function staffLabel(account: { id: string; firstName: string; lastName: string }, myAccountId?: string | null) {
  const name = `${account.firstName} ${account.lastName}`.trim();
  return account.id === myAccountId ? `${name} (me)` : name;
}

export function WalkInDialog({
  orgId,
  open,
  onOpenChange,
  defaultAccountId,
  onCreated,
}: WalkInDialogProps) {
  const queryClient = useQueryClient();
  const { plan } = useOrgPlan(orgId);
  const trialExpired = useOrgWriteLocked();
  const smsSendingOn = isSmsSendingEnabled(plan);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [mergeConfirm, setMergeConfirm] = useState<{
    customer: Customer;
    matchedBy: 'email' | 'phone' | 'selected';
    data: FormData;
  } | null>(null);
  const [undoConfirmOpen, setUndoConfirmOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountId: defaultAccountId ?? '',
      serviceId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
  });

  const accountId = watch('accountId');
  const serviceId = watch('serviceId');
  const firstName = watch('firstName') ?? '';
  const lastName = watch('lastName') ?? '';
  const email = watch('email') ?? '';
  const phone = watch('phone') ?? '';

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

  const { data: orgData } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => orgApi.getOrganization(orgId),
    enabled: open,
  });
  const org = orgData?.organization;
  const customers = customersData?.customers ?? [];
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;

  const staffAccounts = useMemo(
    () =>
      (accountsData?.accounts ?? [])
        .filter((account) => account.isBookable && account.status === 'active')
        .slice()
        .sort((a, b) => {
          const last = a.lastName.localeCompare(b.lastName);
          return last !== 0 ? last : a.firstName.localeCompare(b.firstName);
        }),
    [accountsData],
  );

  const services = useMemo(
    () => (servicesData?.services ?? []).filter((service) => service.isActive),
    [servicesData],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedCustomerId(null);
    setSmsOptIn(false);
    setMergeConfirm(null);
    setUndoConfirmOpen(false);
    reset({
      accountId: defaultAccountId ?? '',
      serviceId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    });
  }, [open, defaultAccountId, reset]);

  useEffect(() => {
    if (open && trialExpired) {
      toast.error(TRIAL_LOCKED_MESSAGE);
      onOpenChange(false);
    }
  }, [open, trialExpired, onOpenChange]);

  useEffect(() => {
    register('accountId');
    register('serviceId');
    register('firstName');
    register('lastName');
    register('email');
    register('phone');
  }, [register]);

  const showSmsOptIn = Boolean(
    (isStagingApp() || plan?.smsRemindersEnabled) &&
      org?.smsRemindersOptIn &&
      phone.trim().length > 0 &&
      !(
        selectedCustomer?.smsOptInAt ||
        findExistingCustomerMatch(customers, { email, phone })?.customer.smsOptInAt
      ),
  );

  const mutation = useMutation({
    mutationFn: async ({
      data,
      customerId,
      updateCustomer,
    }: {
      data: FormData;
      customerId?: string;
      updateCustomer?: boolean;
    }) => {
      if (customerId && updateCustomer) {
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
        startTime: walkInStartTimeIso(),
        timezone: DEFAULT_TIMEZONE,
        smsOptIn: smsOptIn || undefined,
        walkIn: true,
      });

      try {
        await orgApi.updateAppointmentVisitStatus(orgId, created.appointment.id, 'arrived');
        return { ...created, appointment: { ...created.appointment, visitStatus: 'arrived' as const } };
      } catch {
        return created;
      }
    },
    onSuccess: (result) => {
      const created = [result.appointment];
      toast.success(
        result.appointment.startTime
          ? `Walk-in added · ${formatDateTime(result.appointment.startTime)}`
          : 'Walk-in added',
      );
      queryClient.setQueriesData<{ appointments: Appointment[] }>(
        { queryKey: ['appointments'] },
        (old) => {
          if (!old?.appointments) return old;
          if (old.appointments.some((existing) => existing.id === result.appointment.id)) return old;
          return { ...old, appointments: [...old.appointments, result.appointment] };
        },
      );
      onCreated?.(created);
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['customers', orgId] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.code === 'TIME_SLOT_UNAVAILABLE') {
        toast.error('That staff member is already booked right now. Pick another person or wait until they are free.');
        return;
      }
      toast.error(getApiErrorMessage(err, 'Could not add this walk-in'));
    },
  });

  const submitWalkIn = (data: FormData, customerId?: string, updateCustomer = false) => {
    if (trialExpired) {
      toast.error(TRIAL_LOCKED_MESSAGE);
      onOpenChange(false);
      return;
    }
    mutation.mutate({ data, customerId, updateCustomer });
  };

  const handleCreate = (data: FormData) => {
    const match = findExistingCustomerMatch(customers, { email: data.email, phone: data.phone });
    if (match) {
      if (customerContactChanged(match.customer, data)) {
        setMergeConfirm({ customer: match.customer, matchedBy: match.matchedBy, data });
        return;
      }
      submitWalkIn(data, match.customer.id);
      return;
    }
    if (selectedCustomerId) {
      const selected = customers.find((customer) => customer.id === selectedCustomerId);
      if (selected && customerContactChanged(selected, data)) {
        setMergeConfirm({ customer: selected, matchedBy: 'selected', data });
        return;
      }
      submitWalkIn(data, selectedCustomerId);
      return;
    }
    submitWalkIn(data);
  };

  const mergeChanges = mergeConfirm
    ? getCustomerFieldChanges(mergeConfirm.customer, mergeConfirm.data)
    : [];

  const mergeDescription = (() => {
    if (!mergeConfirm) return '';
    if (mergeConfirm.matchedBy === 'selected') {
      return `This updates ${customerDisplayName(mergeConfirm.customer)} in the system, then books the walk-in under that customer. Are you sure?`;
    }
    return `This ${mergeConfirm.matchedBy} is already on file for ${customerDisplayName(mergeConfirm.customer)}. Update their profile and book the walk-in under this customer?`;
  })();

  const handleSelectCustomer = (customer: Customer) => {
    setValue('firstName', customer.firstName, { shouldValidate: true });
    setValue('lastName', customer.lastName, { shouldValidate: true });
    setValue('email', customer.email ?? '', { shouldValidate: true });
    setValue('phone', customer.phone ?? '');
    setSelectedCustomerId(customer.id);
    setSmsOptIn(false);
  };

  const handleSelectNewCustomer = () => {
    setValue('firstName', '', { shouldValidate: false });
    setValue('lastName', '', { shouldValidate: false });
    setValue('email', '', { shouldValidate: false });
    setValue('phone', '');
    setSelectedCustomerId(null);
    setSmsOptIn(false);
  };

  const canSubmit = Boolean(accountId && serviceId && firstName.trim() && lastName.trim());

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Take a walk-in</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit(handleCreate)();
            }}
            className="space-y-4"
          >
            <p className={helperTextClass}>
              Adds this visit to the calendar for right now
              {services.find((service) => service.id === serviceId)
                ? ` · ${services.find((service) => service.id === serviceId)?.durationMinutes} min`
                : ''}
              .
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Service</Label>
                <Select
                  value={serviceId || undefined}
                  onValueChange={(value) => setValue('serviceId', value, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.serviceId ? (
                  <p className="text-xs text-red-600 dark:text-red-400">Required</p>
                ) : null}
              </div>
              <div>
                <Label>Staff</Label>
                <Select
                  value={accountId || undefined}
                  onValueChange={(value) => setValue('accountId', value, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {staffLabel(account, defaultAccountId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.accountId ? (
                  <p className="text-xs text-red-600 dark:text-red-400">Required</p>
                ) : null}
              </div>
            </div>

            <CreateAppointmentCustomerStep
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
              onSelectNewCustomer={handleSelectNewCustomer}
              onRequestUndo={() => setUndoConfirmOpen(true)}
              errors={{
                firstName: errors.firstName?.message,
                lastName: errors.lastName?.message,
                email: errors.email?.message,
              }}
              showSmsOptIn={showSmsOptIn}
              smsBrandName={org?.name ?? 'this business'}
              smsOptIn={smsOptIn}
              onSmsOptInChange={setSmsOptIn}
              smsHelperText={
                smsSendingOn
                  ? 'Optional for a walk-in. If they do not opt in, they will not receive appointment texts.'
                  : SMS_UNDER_REVIEW_OPT_IN_NOTE
              }
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || mutation.isPending}>
                {mutation.isPending ? 'Adding…' : 'Add to calendar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!mergeConfirm}
        onOpenChange={(next) => {
          if (!next) setMergeConfirm(null);
        }}
        title="Update this customer?"
        description={mergeDescription}
        confirmLabel="Update and book"
        onConfirm={() => {
          if (!mergeConfirm) return;
          submitWalkIn(mergeConfirm.data, mergeConfirm.customer.id, true);
          setMergeConfirm(null);
        }}
        loading={mutation.isPending}
      >
        {mergeChanges.length > 0 ? <CustomerFieldChangesList changes={mergeChanges} /> : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={undoConfirmOpen}
        onOpenChange={setUndoConfirmOpen}
        title="Clear customer details?"
        description="This discards the edits on this form. The saved customer record is unchanged."
        confirmLabel="Clear"
        onConfirm={() => {
          if (selectedCustomer) {
            handleSelectCustomer(selectedCustomer);
          } else {
            handleSelectNewCustomer();
          }
          setUndoConfirmOpen(false);
        }}
      />
    </>
  );
}
