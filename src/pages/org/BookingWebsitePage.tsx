import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, Globe, LayoutTemplate } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { orgApi, ownerApi } from '@/lib/api';
import { contactPath } from '@/lib/contact';
import { displayBookingHost, getShareableBookingLink, resolvePathBookingUrl } from '@/lib/public-booking';
import { cn, formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import type { SiteTemplate } from '@/types/api';
import { BookingPagePreview } from '@/components/booking/BookingPagePreview';
import { BookingBrandingSection } from '@/components/settings/BookingBrandingSection';
import { DeveloperApiSection } from '@/components/settings/DeveloperApiSection';
import { HostedSubdomainSection } from '@/components/settings/HostedSubdomainSection';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { normalizeBookingBranding } from '@/lib/booking-branding';
import { LoadingState } from '@/components/common/LoadingState';
import { WebsiteHostingBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function BookingWebsitePage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const trialExpired = useOrgWriteLocked();
  const queryClient = useQueryClient();
  const isPlatformOwner = user?.role === 'platform_owner';

  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', orgId, user?.role],
    queryFn: () => (isPlatformOwner ? ownerApi.getOrganization(orgId!) : orgApi.getOrganization(orgId!)),
    enabled: !!orgId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['website', orgId, user?.role],
    queryFn: () => (isPlatformOwner ? ownerApi.getWebsite(orgId!) : orgApi.getWebsite(orgId!)),
    enabled: !!orgId && (orgData?.organization.publicBookingEnabled ?? false),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof orgApi.updateWebsite>[1]) =>
      isPlatformOwner ? ownerApi.updateWebsite(orgId!, payload) : orgApi.updateWebsite(orgId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website', orgId] });
      toast.success('Booking page updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (orgLoading) return <LoadingState />;

  const publicBookingEnabled = orgData?.organization.publicBookingEnabled ?? false;

  if (!publicBookingEnabled) {
    return (
      <div className="mx-auto max-w-3xl">
        <SettingsBackHeader title="Booking website" backTo={`/orgs/${orgId}/settings`} />
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm text-stone-600 dark:text-stone-300">
            <p>Turn on public booking in Settings → Org Settings to get your free booking page.</p>
            <Button asChild variant="outline">
              <Link to={`/orgs/${orgId}/settings/org`}>Go to org settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) return <LoadingState />;

  const website = data.websiteSettings;
  const branding = normalizeBookingBranding(website.bookingBranding);
  const hostingMode = website.hostingMode ?? 'path';
  const pathUrl = resolvePathBookingUrl(data.pathBookingUrl, data.organizationSlug);
  const share = getShareableBookingLink(data);
  const liveUrl = share.url;
  const liveHost = displayBookingHost(liveUrl);
  const pathHost = displayBookingHost(pathUrl);
  const customSitePending = hostingMode === 'external_api' && share.kind !== 'custom';

  const hero =
    hostingMode === 'subdomain'
      ? {
          title: 'Your hosted subdomain',
          description:
            'Clients book on your Viselle subdomain. Share this link on Instagram, Google, or anywhere you promote the business.',
          hintLabel: 'Included Viselle page',
          hintValue: pathHost,
        }
      : hostingMode === 'external_api'
        ? {
            title: 'Your custom website',
            description: customSitePending
              ? 'This business books on a custom site. Add that site URL under Custom website / developer API so it shows here.'
              : 'Clients book on your own website. Share this URL — it is the live booking site, not the included Viselle page.',
            hintLabel: customSitePending ? 'Fallback included page' : 'Included Viselle page',
            hintValue: pathHost,
          }
        : {
            title: 'Your booking page (included)',
            description:
              'Every plan includes a booking page on Viselle. Share this link on Instagram, Google, or your existing website — clients pick a service and book without calling.',
            hintLabel: 'Format',
            hintValue: `viselle.net/book/${data.organizationSlug}`,
          };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(liveUrl);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy booking link');
    }
  };

  const handleTemplateChange = (template: SiteTemplate) => {
    updateMutation.mutate({
      ...(hostingMode === 'path' || hostingMode === 'subdomain' ? { hostingMode } : {}),
      siteTemplate: template,
    });
  };

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-6">
      <SettingsBackHeader title="Booking website" backTo={`/orgs/${orgId}/settings`} />

      <Card className="overflow-hidden border-brand-200 bg-gradient-to-br from-brand-50 to-white dark:border-stone-700 dark:from-stone-900 dark:to-stone-900">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base text-stone-900 dark:text-stone-50">
            <Globe className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" />
            {hero.title}
            <WebsiteHostingBadge hostingMode={hostingMode} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <div className="min-w-0 space-y-4">
              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-200">{hero.description}</p>
              <div className="min-w-0">
                <Label className="text-stone-800 dark:text-stone-100">Your link</Label>
                <div className="mt-1 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
                  <code className="block min-w-0 flex-1 break-all rounded-md border border-stone-200 bg-white px-3 py-2 text-xs text-brand-700 dark:border-stone-700 dark:bg-stone-800 dark:text-brand-300 sm:text-sm">
                    {liveHost}
                  </code>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => void copyUrl()}>
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <a href={liveUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Preview
                      </a>
                    </Button>
                  </div>
                </div>
                <p className="mt-2 break-words text-xs text-stone-500 dark:text-stone-300">
                  {hero.hintLabel}:{' '}
                  <span className="font-mono text-stone-600 dark:text-stone-200">{hero.hintValue}</span>
                </p>
              </div>
            </div>
            <BookingPagePreview
              template={website.siteTemplate ?? 'classic'}
              branding={branding}
              className="min-w-0"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutTemplate className="h-4 w-4" />
            Page style
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">
            {hostingMode === 'subdomain'
              ? 'Choose how your hosted booking page looks.'
              : hostingMode === 'external_api'
                ? 'This style applies to the included Viselle booking page. Your custom site uses its own design.'
                : 'Choose how your booking page looks. This also applies to a hosted subdomain if you upgrade.'}
          </p>
          <div className="grid min-w-0 gap-4 lg:grid-cols-3">
            {data.siteTemplates.map((template) => (
              <div key={template.id} className="min-w-0 space-y-3">
                <button
                  type="button"
                  onClick={() => handleTemplateChange(template.id)}
                  disabled={updateMutation.isPending || trialExpired}
                  title={trialExpired ? 'Trial expired — upgrade to make changes' : undefined}
                  className={cn(
                    'w-full rounded-lg border bg-white p-4 text-left transition-colors hover:border-brand-300 dark:bg-stone-800/60 dark:hover:border-brand-600',
                    website.siteTemplate === template.id
                      ? 'border-brand-500 ring-2 ring-brand-100 dark:ring-brand-900/60'
                      : 'border-stone-200 dark:border-stone-700',
                  )}
                >
                  <p className="font-medium text-stone-900 dark:text-stone-100">{template.name}</p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{template.description}</p>
                </button>
                <BookingPagePreview
                  template={template.id}
                  branding={branding}
                  className="hidden min-w-0 sm:block"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <BookingBrandingSection
        orgId={orgId!}
        website={website}
        siteTemplate={website.siteTemplate ?? 'classic'}
      />

      <HostedSubdomainSection
        orgId={orgId!}
        data={data}
        isPlatformOwner={isPlatformOwner}
        trialExpired={trialExpired}
        updatePending={updateMutation.isPending}
        onUpdate={(payload) => updateMutation.mutate(payload)}
      />

      <DeveloperApiSection orgId={orgId!} data={data} />

      <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <Label>Status</Label>
        <Badge>{website.deploymentStatus}</Badge>
        {website.lastDeployedAt && <span>Updated {formatDate(website.lastDeployedAt)}</span>}
      </div>

      <p className="text-xs text-stone-500 dark:text-stone-400">
        Need booking on your own website? See{' '}
        <a href="/#websites" className="text-brand-700 hover:underline dark:text-brand-300">
          booking page options on our site
        </a>{' '}
        or{' '}
        <Link to={contactPath({ interest: 'api' })} className="text-brand-700 hover:underline dark:text-brand-300">
          contact us about API access
        </Link>
        .
      </p>
    </div>
  );
}
