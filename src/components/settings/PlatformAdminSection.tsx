import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { PRICING_TIERS } from '@/lib/pricing';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { OrganizationSettings, SubscriptionTier } from '@/types/api';

interface PlatformAdminSectionProps {
  orgId: string;
}

export function PlatformAdminSection({ orgId }: PlatformAdminSectionProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['owner-settings', orgId],
    queryFn: () => ownerApi.getSettings(orgId),
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<OrganizationSettings>) =>
      ownerApi.updateSettings(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-settings', orgId] });
      queryClient.invalidateQueries({ queryKey: ['org-plan', orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const applyTierMutation = useMutation({
    mutationFn: (tier: Exclude<SubscriptionTier, 'custom'>) => ownerApi.applyTier(orgId, tier),
    onSuccess: () => {
      toast.success('Plan tier applied');
      queryClient.invalidateQueries({ queryKey: ['owner-settings', orgId] });
      queryClient.invalidateQueries({ queryKey: ['org-plan', orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState />;

  const settings = data?.settings;
  if (!settings) return null;

  const currentTier = settings.subscriptionTier ?? 'custom';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plan & features</CardTitle>
        <p className="text-sm text-stone-500">Subscription tier and feature flags for this organization</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-2 block">Apply plan tier</Label>
          <div className="flex flex-wrap gap-2">
            <Select
              value={currentTier === 'custom' ? undefined : currentTier}
              onValueChange={(v) => applyTierMutation.mutate(v as Exclude<SubscriptionTier, 'custom'>)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={currentTier === 'custom' ? 'Custom (manual)' : undefined} />
              </SelectTrigger>
              <SelectContent>
                {PRICING_TIERS.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {tier.name} — ${tier.priceMonthly}/mo
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="self-center text-xs text-stone-500">
              Current: <span className="font-medium capitalize">{currentTier}</span>
            </p>
          </div>
        </div>

        {[
          { key: 'smsRemindersEnabled' as const, label: 'SMS Reminders' },
          { key: 'emailRemindersEnabled' as const, label: 'Email Reminders' },
          { key: 'recurringAppointmentsEnabled' as const, label: 'Recurring Appointments' },
          { key: 'subdomainHostingEnabled' as const, label: 'Hosted subdomain purchased' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <Label>{label}</Label>
            <Switch
              checked={settings[key]}
              onCheckedChange={(v) =>
                updateMutation.mutate(
                  key === 'subdomainHostingEnabled'
                    ? { [key]: v }
                    : { [key]: v, subscriptionTier: 'custom' },
                )
              }
            />
          </div>
        ))}
        {(updateMutation.isPending || applyTierMutation.isPending) && (
          <p className="text-xs text-stone-500">Saving…</p>
        )}
      </CardContent>
    </Card>
  );
}
