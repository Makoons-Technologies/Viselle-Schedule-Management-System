import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { ownerApi } from '@/lib/api';
import { slugify, dollarsToCents } from '@/lib/utils';
import { useOrg } from '@/context/OrgContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  monthlyPriceDollars: z.number().positive(),
});

type FormData = z.infer<typeof schema>;

export function CreateOrganizationPage() {
  const navigate = useNavigate();
  const { setSelectedOrgId } = useOrg();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { monthlyPriceDollars: 99 },
  });

  const name = watch('name');
  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      ownerApi.createOrganization({
        name: data.name,
        slug: data.slug,
        monthlyPriceCents: dollarsToCents(data.monthlyPriceDollars),
      }),
    onSuccess: (result) => {
      toast.success('Organization created');
      setSelectedOrgId(result.organization.id);
      navigate(`/orgs/${result.organization.id}/dashboard`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div>
      <PageHeader title="Create Organization" description="Add a new tenant to the platform" />
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <form
            onSubmit={handleSubmit((d) => mutation.mutate(d))}
            className="space-y-4"
          >
            <div>
              <Label>Name</Label>
              <Input
                {...register('name')}
                onBlur={() => {
                  if (!watch('slug')) setValue('slug', slugify(name));
                }}
              />
              {errors.name && <p className="text-xs text-red-600">Required</p>}
            </div>
            <div>
              <Label>Slug</Label>
              <Input {...register('slug')} />
            </div>
            <div>
              <Label>Monthly price ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="99.00"
                {...register('monthlyPriceDollars', { valueAsNumber: true })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>Create</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
