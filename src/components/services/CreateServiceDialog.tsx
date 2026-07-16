import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { orgApi } from '@/lib/api';
import { centsToDollars, dollarsToCents } from '@/lib/utils';
import type { Service } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  priceDollars: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateServiceDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

export function CreateServiceDialog({ orgId, open, onOpenChange, service }: CreateServiceDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!service;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { durationMinutes: 60, isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    if (service) {
      reset({
        name: service.name,
        description: service.description ?? '',
        durationMinutes: service.durationMinutes,
        priceDollars: service.priceCents != null ? centsToDollars(service.priceCents) : undefined,
        isActive: service.isActive,
      });
      return;
    }
    reset({ durationMinutes: 60, isActive: true, name: '', description: '', priceDollars: undefined });
  }, [open, service, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        durationMinutes: data.durationMinutes,
        priceCents:
          data.priceDollars != null && !Number.isNaN(data.priceDollars)
            ? dollarsToCents(data.priceDollars)
            : undefined,
        ...(isEditing ? { isActive: data.isActive ?? true } : {}),
      };

      return isEditing
        ? orgApi.updateService(orgId, service!.id, payload)
        : orgApi.createService(orgId, payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Service updated' : 'Service created');
      queryClient.invalidateQueries({ queryKey: ['services', orgId] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isActive = watch('isActive') ?? true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit service' : 'Add service'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-red-600">Required</p>}
          </div>
          <div>
            <Label>Description</Label>
            <Textarea {...register('description')} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" {...register('durationMinutes', { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="49.00"
                {...register('priceDollars', { valueAsNumber: true })}
              />
            </div>
          </div>
          {isEditing && (
            <div className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Inactive services are hidden from online booking.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={(checked) => setValue('isActive', checked)} />
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
