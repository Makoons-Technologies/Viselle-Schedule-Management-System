import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { ownerApi } from '@/lib/api';
import { PRICING_TIERS } from '@/lib/pricing';
import { slugify } from '@/lib/utils';
import { useOrg } from '@/context/OrgContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SubscriptionTier } from '@/types/api';

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  tier: z.enum(['starter', 'professional', 'business']),
  ownerEmail: z.string().email().optional().or(z.literal('')),
  ownerPassword: z.string().min(6).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export function CreateOrganizationPage() {
  const navigate = useNavigate();
  const { setSelectedOrgId } = useOrg();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tier: 'professional', ownerEmail: '', ownerPassword: '' },
  });

  const name = watch('name');
  const tier = watch('tier') as Exclude<SubscriptionTier, 'custom'>;

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      ownerApi.createOrganization({
        name: data.name,
        slug: data.slug,
        tier: data.tier,
        ownerEmail: data.ownerEmail || undefined,
        ownerPassword: data.ownerPassword || undefined,
      }),
    onSuccess: (result) => {
      toast.success('Organization created');
      setSelectedOrgId(result.organization.id);
      navigate(`/orgs/${result.organization.id}/dashboard`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const selectedTier = PRICING_TIERS.find((t) => t.id === tier);

  return (
    <div>
      <PageHeader title="Create Organization" description="Add a new tenant with a pricing tier" />
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
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
              <Label>Plan tier</Label>
              <Select value={tier} onValueChange={(v) => setValue('tier', v as FormData['tier'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRICING_TIERS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name} — ${option.priceMonthly}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTier && (
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  {selectedTier.tagline}. {selectedTier.staffLimit}.
                </p>
              )}
            </div>
            <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
              <p className="text-sm font-medium text-stone-700 dark:text-stone-200">Optional org owner login</p>
              <div>
                <Label>Owner email</Label>
                <Input
                  type="email"
                  autoComplete="off"
                  placeholder="owner@salon.com"
                  {...register('ownerEmail')}
                />
              </div>
              <div>
                <Label>Owner password</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  {...register('ownerPassword')}
                />
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Leave email blank to skip creating a login.
                </p>
              </div>
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
