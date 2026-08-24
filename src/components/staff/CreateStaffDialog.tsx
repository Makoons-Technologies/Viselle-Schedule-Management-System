import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { getApiErrorMessage, isUnreachableRequestError, orgApi } from '@/lib/api';
import { redirectToStripeUrl } from '@/lib/safe-redirect';
import { withoutReactFormReset } from '@/lib/form-submit';
import { findReconciledStaffAccount } from '@/lib/staff-create';
import type { Account } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'staff']),
  isBookable: z.boolean(),
  commissionPercent: z.number().min(0).max(100),
  status: z.enum(['active', 'inactive']),
});

type FormData = z.infer<typeof schema>;

interface CreateStaffDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  /** Account ids already on the staff list — used to reject a no-op create. */
  existingAccountIds?: string[];
}

export function CreateStaffDialog({
  orgId,
  open,
  onOpenChange,
  account,
  existingAccountIds = [],
}: CreateStaffDialogProps) {
  const queryClient = useQueryClient();
  const payoutSettingsQuery = useQuery({
    queryKey: ['staff-payouts', orgId],
    queryFn: () => orgApi.getStaffPayoutSettings(orgId),
    enabled: !!orgId && open,
  });
  const showBankSetup = payoutSettingsQuery.data?.mode === 'salon_stripe';
  const isEditing = !!account;
  const isOrgOwner = account?.role === 'org_owner';
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'staff', isBookable: true, commissionPercent: 0, status: 'active' },
  });
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    // Only seed when the dialog opens. A failed Create must not wipe fields
    // (React 19 form reset + reset() identity changes).
    if (wasOpen.current) return;
    wasOpen.current = true;
    setSubmitError(null);
    if (account) {
      reset({
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        phone: account.phone ?? '',
        role: account.role === 'admin' ? 'admin' : 'staff',
        isBookable: account.isBookable,
        commissionPercent: account.commissionPercent ?? 0,
        status: account.status === 'inactive' ? 'inactive' : 'active',
      });
      return;
    }
    reset({ role: 'staff', isBookable: true, commissionPercent: 0, status: 'active', firstName: '', lastName: '', email: '', phone: '' });
  }, [open, account, reset]);

  const onboardBankMutation = useMutation({
    mutationFn: async () => {
      if (!account) throw new Error('Save this staff member first.');
      if (account.stripeRecipientPayoutsReady) {
        return orgApi.syncStaffPayoutRecipient(orgId, account.id);
      }
      return orgApi.startStaffPayoutOnboarding(orgId, account.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      queryClient.invalidateQueries({ queryKey: ['staff-payouts', orgId] });
      if ('url' in result && result.url) {
        if (!redirectToStripeUrl(result.url)) toast.error('Received an unexpected onboarding URL');
        return;
      }
      toast.success('Bank status updated');
    },
    onError: (err: Error) => toast.error(getApiErrorMessage(err, 'Could not start bank setup.')),
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone?.trim() || undefined,
        isBookable: data.isBookable,
        commissionPercent: data.commissionPercent,
        ...(isEditing
          ? isOrgOwner
            ? {}
            : { role: data.role, status: data.status }
          : { role: data.role ?? 'staff' }),
      };

      if (isEditing) {
        return orgApi.updateAccount(orgId, account!.id, payload);
      }

      try {
        const result = await orgApi.createAccount(orgId, { ...payload, role: data.role ?? 'staff' });
        const created = result.account;
        if (!created?.id) {
          throw new Error('Staff was not created. Try again or contact support.');
        }
        if (created.role === 'org_owner' || existingAccountIds.includes(created.id)) {
          throw new Error(
            'No new staff member was added. That email is already used on this team — use a different email.',
          );
        }
        return result;
      } catch (err) {
        if (!isUnreachableRequestError(err)) throw err;
        // Isolation QA: same ERR_FAILED class as check-in (server OK, UI Network Error).
        const listed = await orgApi.listAccounts(orgId).catch(() => null);
        const reconciled = listed
          ? findReconciledStaffAccount(listed.accounts, data.email, existingAccountIds)
          : undefined;
        if (reconciled) {
          return { account: reconciled };
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      setSubmitError(null);
      if (isEditing) {
        toast.success('Staff member updated');
      } else if (result && 'emailSent' in result && result.emailSent === false) {
        toast.warning(
          'Staff member added, but the invite email could not be sent. They can use Forgot password on the sign-in page.',
        );
      } else {
        toast.success('Staff member created — they will receive an email to set their password');
      }
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(err, 'Could not save this staff member. Try again.');
      setSubmitError(message);
      toast.error(message);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && mutation.isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        onPointerDownOutside={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit staff member' : 'Add staff member'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={withoutReactFormReset(
            handleSubmit((d) => {
              setSubmitError(null);
              mutation.mutate(d);
            }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>First name</Label>
              <Input {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label>Last name</Label>
              <Input {...register('lastName')} />
              {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <Label>Phone</Label>
            <Input {...register('phone')} />
          </div>
          {!isOrgOwner && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Role</Label>
                <Select value={watch('role')} onValueChange={(v) => setValue('role', v as FormData['role'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isEditing && (
                <div>
                  <Label>Status</Label>
                  <Select
                    value={watch('status')}
                    onValueChange={(v) => setValue('status', v as FormData['status'])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={watch('isBookable')} onCheckedChange={(v) => setValue('isBookable', v)} />
            <Label>Bookable for appointments</Label>
          </div>
          <div>
            <Label>Commission percent</Label>
            <Input type="number" min={0} max={100} step={0.5} {...register('commissionPercent', { valueAsNumber: true })} />
            <p className="mt-1 text-xs text-stone-500">Share of service sales this person earns. Tips still go 100% to them.</p>
          </div>
          {isEditing && showBankSetup ? (
            <div className="rounded-lg border border-stone-200 p-3 dark:border-stone-700">
              <p className="text-sm font-medium">Payout bank</p>
              <p className="mt-1 text-xs text-stone-500">
                {account.stripeRecipientPayoutsReady
                  ? 'Bank is ready for salon Stripe transfers.'
                  : 'Needed only if you pay this person from salon Stripe. Not payroll.'}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                disabled={onboardBankMutation.isPending}
                onClick={() => onboardBankMutation.mutate()}
              >
                {account.stripeRecipientPayoutsReady ? 'Refresh bank status' : 'Add bank'}
              </Button>
            </div>
          ) : null}
          {!isEditing && (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              An email invite will be sent so they can set their own password and sign in.
              If they already have a Viselle account, they will be added to this organization.
            </p>
          )}
          {isEditing && !isOrgOwner && (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Staff manage their own password from the sign-in page.
            </p>
          )}
          {submitError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
              {submitError}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (isEditing ? 'Saving…' : 'Creating…') : isEditing ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
