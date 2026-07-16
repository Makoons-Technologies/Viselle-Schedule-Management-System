import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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

const passwordField = z
  .string()
  .optional()
  .refine((value) => !value || value.trim().length === 0 || value.trim().length >= 6, {
    message: 'Password must be at least 6 characters',
  });

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'staff']),
  isBookable: z.boolean(),
  status: z.enum(['active', 'inactive']),
  password: passwordField,
});

type FormData = z.infer<typeof schema>;

interface CreateStaffDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
}

export function CreateStaffDialog({ orgId, open, onOpenChange, account }: CreateStaffDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!account;
  const isOrgOwner = account?.role === 'org_owner';

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'staff', isBookable: true, status: 'active' },
  });

  useEffect(() => {
    if (!open) return;
    if (account) {
      reset({
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        phone: account.phone ?? '',
        role: account.role === 'admin' ? 'admin' : 'staff',
        isBookable: account.isBookable,
        status: account.status === 'inactive' ? 'inactive' : 'active',
        password: '',
      });
      return;
    }
    reset({ role: 'staff', isBookable: true, status: 'active', firstName: '', lastName: '', email: '', phone: '', password: '' });
  }, [open, account, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const password = data.password?.trim() ? data.password : undefined;
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone?.trim() || undefined,
        isBookable: data.isBookable,
        ...(isEditing
          ? {
              ...(isOrgOwner
                ? {}
                : {
                    role: data.role,
                    status: data.status,
                  }),
              password,
            }
          : {
              role: data.role,
              password,
            }),
      };

      return isEditing
        ? orgApi.updateAccount(orgId, account!.id, payload)
        : orgApi.createAccount(orgId, payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Staff member updated' : 'Staff member created');
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit staff member' : 'Add staff member'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
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
          {!isOrgOwner && (
            <div>
              <Label htmlFor="staff-password">
                {isEditing ? 'New password (optional)' : 'Login password (optional)'}
              </Label>
              <Input
                id="staff-password"
                type="password"
                autoComplete="new-password"
                placeholder={isEditing && account?.userId ? 'Leave blank to keep current password' : undefined}
                {...register('password')}
              />
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {isEditing
                  ? 'Set or reset their sign-in password. Their login email matches the email above.'
                  : 'Set a password so they can sign in to view their schedule.'}
              </p>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {isEditing ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
