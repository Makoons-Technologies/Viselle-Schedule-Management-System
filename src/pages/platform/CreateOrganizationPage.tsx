import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { ownerApi } from '@/lib/api';
import { slugify } from '@/lib/utils';
import { useOrg } from '@/context/OrgContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TrialCampaign } from '@/types/api';

const NONE_CAMPAIGN = '__none__';

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  trialCampaignId: z.string().optional(),
  ownerEmail: z.string().email('Enter a valid owner email'),
});

type FormData = z.infer<typeof schema>;

function isCampaignSelectable(campaign: TrialCampaign): boolean {
  if (!campaign.enabled) return false;
  if (campaign.expiresAt && new Date(campaign.expiresAt).getTime() <= Date.now()) return false;
  if (campaign.maxRedemptions != null && campaign.redemptionCount >= campaign.maxRedemptions) {
    return false;
  }
  return true;
}

function campaignOptionLabel(campaign: TrialCampaign): string {
  const typeLabel = campaign.type === 'homepage' ? 'Homepage' : campaign.code ?? 'Code';
  const tier = campaign.lockedTier.charAt(0).toUpperCase() + campaign.lockedTier.slice(1);
  return `${campaign.name} — ${campaign.durationDays}d · ${tier} · ${typeLabel}`;
}

export function CreateOrganizationPage() {
  const navigate = useNavigate();
  const { setSelectedOrgId } = useOrg();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { trialCampaignId: NONE_CAMPAIGN, ownerEmail: '' },
  });

  const name = watch('name');
  const trialCampaignId = watch('trialCampaignId') ?? NONE_CAMPAIGN;

  const campaignsQuery = useQuery({
    queryKey: ['owner', 'trial-campaigns'],
    queryFn: () => ownerApi.listTrialCampaigns(),
  });

  const selectableCampaigns = useMemo(
    () => (campaignsQuery.data?.campaigns ?? []).filter(isCampaignSelectable),
    [campaignsQuery.data?.campaigns],
  );

  const selectedCampaign = selectableCampaigns.find((c) => c.id === trialCampaignId);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      ownerApi.createOrganization({
        name: data.name,
        slug: data.slug,
        ownerEmail: data.ownerEmail.trim(),
        trialCampaignId:
          data.trialCampaignId && data.trialCampaignId !== NONE_CAMPAIGN
            ? data.trialCampaignId
            : null,
      }),
    onSuccess: (result) => {
      toast.success('Organization created — set-password email sent to the owner');
      setSelectedOrgId(result.organization.id);
      navigate(`/platform/orgs/${result.organization.id}/settings`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div>
      <PageHeader
        title="Create Organization"
        description="Add a new tenant and optionally attach a trial campaign"
      />
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
              <Label>Trial campaign</Label>
              <Select
                value={trialCampaignId}
                onValueChange={(v) => setValue('trialCampaignId', v)}
                disabled={campaignsQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={campaignsQuery.isLoading ? 'Loading campaigns…' : 'No trial'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_CAMPAIGN}>No trial — owner chooses plan on login</SelectItem>
                  {selectableCampaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaignOptionLabel(campaign)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {campaignsQuery.isError && (
                <p className="mt-2 text-xs text-red-600">Could not load trial campaigns.</p>
              )}
              {!campaignsQuery.isLoading && selectableCampaigns.length === 0 && (
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  No redeemable campaigns right now. Create one under Trials &amp; Campaigns, or leave as no trial.
                </p>
              )}
              {selectedCampaign && (
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  Starts a {selectedCampaign.durationDays}-day trial locked to{' '}
                  {selectedCampaign.lockedTier}. Feature access matches an active trial until it ends.
                </p>
              )}
              {trialCampaignId === NONE_CAMPAIGN && (
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  Org is created without a trial. The owner will need to subscribe before using the product.
                </p>
              )}
            </div>
            <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
              <p className="text-sm font-medium text-stone-700 dark:text-stone-200">Org owner login</p>
              <div>
                <Label>Owner email</Label>
                <Input
                  type="email"
                  autoComplete="off"
                  placeholder="owner@salon.com"
                  {...register('ownerEmail')}
                />
                {errors.ownerEmail && (
                  <p className="mt-1 text-xs text-red-600">{errors.ownerEmail.message}</p>
                )}
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  We&apos;ll email a link to set their password. Need another login in the same inbox?
                  Use a plus tag like you+salon@gmail.com.
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
