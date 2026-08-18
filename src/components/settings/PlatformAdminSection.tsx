import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { PRICING_TIERS } from '@/lib/pricing';
import { displayBookingHost, getShareableBookingLink } from '@/lib/public-booking';
import { LoadingState } from '@/components/common/LoadingState';
import { WebsiteHostingBadge } from '@/components/common/StatusBadge';
import { CustomWebsiteStatusBadge } from '@/components/customWebsites/CustomWebsiteStatusBadge';
import { CustomSiteUrlFields } from '@/components/settings/DeveloperApiSection';
import { HostedSubdomainSection } from '@/components/settings/HostedSubdomainSection';
import { Button } from '@/components/ui/button';
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
  const [customUrlDraft, setCustomUrlDraft] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['owner-settings', orgId],
    queryFn: () => ownerApi.getSettings(orgId),
    enabled: !!orgId,
  });

  const { data: websiteData, isLoading: websiteLoading } = useQuery({
    queryKey: ['website', orgId, 'platform_owner'],
    queryFn: () => ownerApi.getWebsite(orgId),
    enabled: !!orgId,
  });

  const { data: requestData } = useQuery({
    queryKey: ['custom-website-requests', 'org', orgId],
    queryFn: () => ownerApi.listCustomWebsiteRequests({ organizationId: orgId }),
    enabled: !!orgId,
  });

  useEffect(() => {
    if (!websiteData) return;
    const stored = websiteData.websiteSettings.deployedSiteUrl;
    setCustomUrlDraft(stored && !/localhost|127\.0\.0\.1/i.test(stored) ? stored : '');
  }, [websiteData]);

  const invalidateHosting = () => {
    queryClient.invalidateQueries({ queryKey: ['owner-settings', orgId] });
    queryClient.invalidateQueries({ queryKey: ['org-plan', orgId] });
    queryClient.invalidateQueries({ queryKey: ['website', orgId] });
    queryClient.invalidateQueries({ queryKey: ['custom-website-requests', 'org', orgId] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<OrganizationSettings>) => ownerApi.updateSettings(orgId, payload),
    onSuccess: () => {
      invalidateHosting();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateWebsiteMutation = useMutation({
    mutationFn: (payload: Parameters<typeof ownerApi.updateWebsite>[1]) =>
      ownerApi.updateWebsite(orgId, payload),
    onSuccess: () => {
      invalidateHosting();
      toast.success('Website hosting updated');
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

  if (isLoading || websiteLoading) return <LoadingState />;

  const settings = data?.settings;
  if (!settings) return null;

  const currentTier = settings.subscriptionTier ?? 'custom';
  const hostingMode = websiteData?.websiteSettings.hostingMode ?? 'path';
  const share = websiteData ? getShareableBookingLink(websiteData) : null;
  const liveUrl = share?.url ?? '';
  const liveHost = liveUrl ? displayBookingHost(liveUrl) : '';
  const websiteRequests = requestData?.requests ?? [];
  const activeRequest =
    websiteRequests.find((request) => request.status === 'open' || request.status === 'in_progress') ??
    websiteRequests[0];

  return (
    <>
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
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch
                checked={settings[key]}
                onCheckedChange={(v) => updateMutation.mutate({ [key]: v, subscriptionTier: 'custom' })}
              />
            </div>
          ))}
          {(updateMutation.isPending || applyTierMutation.isPending) && (
            <p className="text-xs text-stone-500">Saving…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Website hosting</CardTitle>
          <p className="text-sm text-stone-500">
            Hosted subdomain and Viselle custom websites are set here. Org users cannot change them. They can still
            add their own 3rd-party site URL from Booking website. The Public Booking API is included either way.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Build request</p>
              {activeRequest ? (
                <div className="flex flex-wrap items-center gap-2">
                  <CustomWebsiteStatusBadge status={activeRequest.status} />
                  <span className="text-xs text-stone-500">
                    {activeRequest.source.replace('_', ' ')} ·{' '}
                    {new Date(activeRequest.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-stone-500">
                  No Get Started custom-website request for this org. You can still toggle hosting below.
                </p>
              )}
              {activeRequest && !settings.externalApiEnabled && activeRequest.status !== 'done' && (
                <p className="text-xs text-stone-500">
                  When the site is ready, open the request and use Go live.
                </p>
              )}
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link
                to={
                  activeRequest
                    ? `/platform/custom-websites/${activeRequest.id}`
                    : '/platform/custom-websites'
                }
              >
                {activeRequest ? 'Open request' : 'Inbox'}
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <WebsiteHostingBadge
              hostingMode={hostingMode}
              customWebsiteRequested={settings.externalApiEnabled}
            />
            <span className="text-xs text-stone-500">
              {hostingMode === 'subdomain'
                ? 'Live on Viselle-hosted subdomain'
                : settings.externalApiEnabled
                  ? 'Viselle custom website'
                  : hostingMode === 'external_api'
                    ? "Org's own website"
                    : 'Included booking page'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Hosted subdomain</Label>
              <p className="text-xs text-stone-500">Turns on yourspa.viselle.net and locks it for the org.</p>
            </div>
            <Switch
              checked={settings.subdomainHostingEnabled}
              onCheckedChange={(v) =>
                updateMutation.mutate({
                  subdomainHostingEnabled: v,
                  ...(v ? { externalApiEnabled: false } : {}),
                })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Custom website (Viselle-built)</Label>
              <p className="text-xs text-stone-500">
                Uses the site we build as their booking link. Does not turn the API on or off — that stays included.
              </p>
            </div>
            <Switch
              checked={settings.externalApiEnabled}
              onCheckedChange={(v) =>
                updateMutation.mutate({
                  externalApiEnabled: v,
                  ...(v ? { subdomainHostingEnabled: false } : {}),
                })
              }
            />
          </div>

          {websiteData && settings.subdomainHostingEnabled && (
            <HostedSubdomainSection
              orgId={orgId}
              data={websiteData}
              isPlatformOwner
              trialExpired={false}
              updatePending={updateWebsiteMutation.isPending}
              variant="inline"
              onUpdate={(payload) => updateWebsiteMutation.mutate(payload)}
            />
          )}

          {settings.externalApiEnabled && (
            <CustomSiteUrlFields
              draft={customUrlDraft}
              onDraftChange={setCustomUrlDraft}
              onSave={() => {
                const trimmed = customUrlDraft.trim();
                updateWebsiteMutation.mutate({
                  hostingMode: 'external_api',
                  deployedSiteUrl: trimmed || null,
                });
              }}
              pending={updateWebsiteMutation.isPending}
              trialExpired={false}
              liveHost={liveHost}
              liveUrl={liveUrl}
              showLive={share?.kind === 'custom'}
              description="Live URL for the Viselle-built custom website. Shown on the org dashboard as their booking link."
              onCopy={() => {
                void navigator.clipboard.writeText(liveUrl).then(
                  () => toast.success('Link copied'),
                  () => toast.error('Could not copy link'),
                );
              }}
            />
          )}

          {(updateMutation.isPending || updateWebsiteMutation.isPending) && (
            <p className="text-xs text-stone-500">Saving…</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
