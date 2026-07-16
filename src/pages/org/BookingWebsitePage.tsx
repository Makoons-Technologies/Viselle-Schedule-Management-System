import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, Globe, LayoutTemplate, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { orgApi, ownerApi } from '@/lib/api';
import { contactPath } from '@/lib/contact';
import { getBookingPageUrl, getSubdomainBookingUrl } from '@/lib/public-booking';
import { cn, formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import type { SiteTemplate } from '@/types/api';
import { BookingPagePreview } from '@/components/booking/BookingPagePreview';
import { BookingBrandingSection } from '@/components/settings/BookingBrandingSection';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { normalizeBookingBranding } from '@/lib/booking-branding';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function BookingWebsitePage() {
  const orgId = useOrgId();
  const { user } = useAuth();
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
  const pathUrl = data.pathBookingUrl || getBookingPageUrl(data.organizationSlug);
  const subdomainUrl = getSubdomainBookingUrl(data.organizationSlug, data.subdomainBaseDomain);
  const liveUrl = hostingMode === 'subdomain' ? subdomainUrl : pathUrl;

  const copyUrl = async () => {
    await navigator.clipboard.writeText(liveUrl);
    toast.success('Link copied');
  };

  const handleTemplateChange = (template: SiteTemplate) => {
    updateMutation.mutate({
      hostingMode: hostingMode === 'subdomain' ? 'subdomain' : 'path',
      siteTemplate: template,
    });
  };

  const enableSubdomain = () => {
    updateMutation.mutate({
      hostingMode: 'subdomain',
      siteTemplate: website.siteTemplate ?? data.siteTemplates[0]?.id ?? 'classic',
    });
  };

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-6">
      <SettingsBackHeader title="Booking website" backTo={`/orgs/${orgId}/settings`} />

      <Card className="overflow-hidden border-brand-200 bg-gradient-to-br from-brand-50 to-white dark:border-stone-700 dark:from-stone-900 dark:to-stone-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-stone-900 dark:text-stone-50">
            <Globe className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" />
            Your booking page (included)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <div className="min-w-0 space-y-4">
              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-200">
                Every plan includes a booking page on Viselle. Share this link on Instagram, Google, or your
                existing website — clients pick a service and book without calling.
              </p>
              <div className="min-w-0">
                <Label className="text-stone-800 dark:text-stone-100">Your link</Label>
                <div className="mt-1 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
                  <code className="block min-w-0 flex-1 break-all rounded-md border border-stone-200 bg-white px-3 py-2 text-xs text-brand-700 dark:border-stone-700 dark:bg-stone-800 dark:text-brand-300 sm:text-sm">
                    {pathUrl.replace(/^https?:\/\//, '')}
                  </code>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={copyUrl}>
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <a href={pathUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Preview
                      </a>
                    </Button>
                  </div>
                </div>
                <p className="mt-2 break-words text-xs text-stone-500 dark:text-stone-300">
                  Format:{' '}
                  <span className="font-mono text-stone-600 dark:text-stone-200">
                    yoursite.com/book/{data.organizationSlug}
                  </span>
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
            Choose how your booking page looks. This applies to your included link and your hosted subdomain if you upgrade.
          </p>
          <div className="grid min-w-0 gap-4 lg:grid-cols-3">
            {data.siteTemplates.map((template) => (
              <div key={template.id} className="min-w-0 space-y-3">
                <button
                  type="button"
                  onClick={() => handleTemplateChange(template.id)}
                  disabled={updateMutation.isPending}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Hosted subdomain (paid add-on)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Upgrade to your own subdomain like{' '}
            <span className="font-mono text-brand-700 dark:text-brand-300">
              {data.organizationSlug}.{data.subdomainBaseDomain}
            </span>
            . It shows the same booking page as your included link — same style, branding, and services — at a
            shorter, branded address.
          </p>

          {data.subdomainHostingEnabled ? (
            <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">Subdomain enabled</Badge>
                {hostingMode === 'subdomain' && <Badge>Live on subdomain</Badge>}
              </div>
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300">{subdomainUrl}</p>
              {hostingMode !== 'subdomain' ? (
                <Button onClick={enableSubdomain} disabled={updateMutation.isPending}>
                  Switch to hosted subdomain
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <a href={subdomainUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open subdomain site
                  </a>
                </Button>
              )}
              {hostingMode === 'subdomain' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-stone-500 dark:text-stone-400"
                  onClick={() => updateMutation.mutate({ hostingMode: 'path', siteTemplate: website.siteTemplate })}
                >
                  Use included link instead
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={contactPath({ interest: 'subdomain', slug: data.organizationSlug })}>
                  Request hosted subdomain
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href="/#websites">Compare booking page options</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
