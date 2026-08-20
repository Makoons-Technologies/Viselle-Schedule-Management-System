import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { orgApi } from '@/lib/api';
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
  const isEditing = !!account;
  const isOrgOwner = account?.role === 'org_owner';
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'staff', isBookable: true, status: 'active' },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (account) {
      reset({
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        phone: account.phone ?? '',
        role: account.role === 'admin' ? 'admin' : 'staff',
        isBookable: account.isBookable,
        status: account.status === 'inactive' ? 'inactive' : 'active',
      });
      return;
    }
    reset({ role: 'staff', isBookable: true, status: 'active', firstName: '', lastName: '', email: '', phone: '' });
  }, [open, account, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone?.trim() || undefined,
        isBookable: data.isBookable,
        ...(isEditing
          ? isOrgOwner
            ? {}
            : { role: data.role, status: data.status }
          : { role: data.role ?? 'staff' }),
      };

      if (isEditing) {
        return orgApi.updateAccount(orgId, account!.id, payload);
      }

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
    onError: (err: Error) => {
      setSubmitError(err.message);
      toast.error(err.message);
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
          onSubmit={handleSubmit((d) => {
            setSubmitError(null);
            mutation.mutate(d);
          })}
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
