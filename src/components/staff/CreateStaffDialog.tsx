import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'staff']),
  isBookable: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface CreateStaffDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStaffDialog({ orgId, open, onOpenChange }: CreateStaffDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'staff', isBookable: true },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => orgApi.createAccount(orgId, data),
    onSuccess: () => {
      toast.success('Staff member created');
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>First name</Label><Input {...register('firstName')} />{errors.firstName && <p className="text-xs text-red-600">Required</p>}</div>
            <div><Label>Last name</Label><Input {...register('lastName')} /></div>
          </div>
          <div><Label>Email</Label><Input type="email" {...register('email')} /></div>
          <div><Label>Phone</Label><Input {...register('phone')} /></div>
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
          <div className="flex items-center gap-2">
            <Switch checked={watch('isBookable')} onCheckedChange={(v) => setValue('isBookable', v)} />
            <Label>Bookable for appointments</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
