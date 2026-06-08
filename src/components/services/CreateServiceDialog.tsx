import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { orgApi } from '@/lib/api';
import { dollarsToCents } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive(),
});

type FormData = z.infer<typeof schema> & { priceDollars?: number };

interface CreateServiceDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateServiceDialog({ orgId, open, onOpenChange }: CreateServiceDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { durationMinutes: 60 },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      orgApi.createService(orgId, {
        name: data.name,
        description: data.description,
        durationMinutes: data.durationMinutes,
        priceCents:
          data.priceDollars != null && !Number.isNaN(data.priceDollars)
            ? dollarsToCents(data.priceDollars)
            : undefined,
      }),
    onSuccess: () => {
      toast.success('Service created');
      queryClient.invalidateQueries({ queryKey: ['services', orgId] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Service</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div><Label>Name</Label><Input {...register('name')} />{errors.name && <p className="text-xs text-red-600">Required</p>}</div>
          <div><Label>Description</Label><Textarea {...register('description')} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Duration (minutes)</Label><Input type="number" {...register('durationMinutes', { valueAsNumber: true })} /></div>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
