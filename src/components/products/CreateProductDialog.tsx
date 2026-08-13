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
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  retailPriceDollars: z.number().min(0),
  costDollars: z.number().min(0).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  stockCapacity: z.number().int().min(0).optional(),
  lowStockAlertPercent: z.number().int().min(1).max(100).optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateProductDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProductDialog({ orgId, open, onOpenChange }: CreateProductDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { stockQuantity: 0, lowStockAlertPercent: 25 },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      orgApi.createProduct(orgId, {
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        description: data.description,
        retailPriceCents: dollarsToCents(data.retailPriceDollars),
        costCents: data.costDollars != null ? dollarsToCents(data.costDollars) : undefined,
        stockQuantity: data.stockQuantity ?? 0,
        lowStockThreshold: data.lowStockThreshold,
        stockCapacity: data.stockCapacity,
        lowStockAlertPercent: data.lowStockAlertPercent ?? 25,
        trackInventory: true,
      }),
    onSuccess: () => {
      toast.success('Product created');
      queryClient.invalidateQueries({ queryKey: ['products', orgId] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div><Label>Name</Label><Input {...register('name')} />{errors.name && <p className="text-xs text-red-600">Required</p>}</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>SKU</Label><Input {...register('sku')} /></div>
            <div><Label>Barcode</Label><Input {...register('barcode')} /></div>
          </div>
          <div><Label>Description</Label><Textarea {...register('description')} /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Retail price ($)</Label>
              <Input type="number" min={0} step={0.01} {...register('retailPriceDollars', { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Cost ($)</Label>
              <Input type="number" min={0} step={0.01} {...register('costDollars', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Initial stock</Label>
              <Input type="number" min={0} {...register('stockQuantity', { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Low stock alert at (qty)</Label>
              <Input type="number" min={0} {...register('lowStockThreshold', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Restock capacity (max)</Label>
              <Input type="number" min={0} {...register('stockCapacity', { valueAsNumber: true })} />
              <p className="mt-1 text-xs text-stone-500">e.g. 50 if you usually buy 50</p>
            </div>
            <div>
              <Label>Alert at % of capacity</Label>
              <Input
                type="number"
                min={1}
                max={100}
                {...register('lowStockAlertPercent', { valueAsNumber: true })}
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
