import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, Key, LayoutTemplate, Plug, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { orgApi, ownerApi } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { SiteTemplate, WebsiteHostingMode } from '@/types/api';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface WebsiteSettingsSectionProps {
  orgId: string;
}

const MODE_OPTIONS: { value: WebsiteHostingMode; label: string; description: string }[] = [
  {
    value: 'none',
    label: 'No hosted site',
    description: 'Do not host a site on our platform.',
  },
  {
    value: 'subdomain',
    label: 'Hosted subdomain',
    description: 'We host a ready-made site on your organization subdomain.',
  },
  {
    value: 'external_api',
    label: 'External site (API access)',
    description: 'Build your own site on your domain and connect it with an API key and origin whitelist.',
  },
];

function parseOriginsText(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function WebsiteSettingsSection({ orgId }: WebsiteSettingsSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isPlatformOwner = user?.role === 'platform_owner';
  const [originsDraft, setOriginsDraft] = useState<string | null>(null);
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const [modeOverride, setModeOverride] = useState<WebsiteHostingMode | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['website', orgId, user?.role],
    queryFn: () => (isPlatformOwner ? ownerApi.getWebsite(orgId) : orgApi.getWebsite(orgId)),
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof orgApi.updateWebsite>[1]) =>
      isPlatformOwner ? ownerApi.updateWebsite(orgId, payload) : orgApi.updateWebsite(orgId, payload),
    onSuccess: () => {
      setModeOverride(null);
      queryClient.invalidateQueries({ queryKey: ['website', orgId] });
    },
    onError: (err: Error) => {
      setModeOverride(null);
      toast.error(err.message);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () =>
      isPlatformOwner ? ownerApi.regenerateWebsiteApiKey(orgId) : orgApi.regenerateWebsiteApiKey(orgId),
    onSuccess: (result) => {
      setRevealedApiKey(result.apiKey);
      queryClient.invalidateQueries({ queryKey: ['website', orgId] });
      toast.success('New API key generated. Copy it now — it will not be shown again.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState />;

  const website = data?.websiteSettings;
  if (!website || !data) return null;

  const hostingMode = modeOverride ?? website.hostingMode ?? 'none';
  const subdomainPreview = `https://${data.organizationSlug}.${data.subdomainBaseDomain}`;
  const originsText =
    originsDraft ?? (data.apiAccess.allowedOrigins.length > 0 ? data.apiAccess.allowedOrigins.join('\n') : '');

  const handleModeChange = (mode: WebsiteHostingMode) => {
    setModeOverride(mode);

    if (mode === 'none') {
      updateMutation.mutate({ hostingMode: 'none' });
      return;
    }
    if (mode === 'subdomain') {
      updateMutation.mutate({
        hostingMode: 'subdomain',
        siteTemplate: website.siteTemplate ?? data.siteTemplates[0]?.id ?? 'classic',
      });
      return;
    }
    updateMutation.mutate({ hostingMode: 'external_api', allowedOrigins: parseOriginsText(originsText) });
  };

  const handleTemplateChange = (template: SiteTemplate) => {
    updateMutation.mutate({ hostingMode: 'subdomain', siteTemplate: template });
  };

  const saveOrigins = () => {
    updateMutation.mutate({
      hostingMode: 'external_api',
      allowedOrigins: parseOriginsText(originsText),
    });
    setOriginsDraft(null);
  };

  const copyApiKey = async () => {
    if (!revealedApiKey) return;
    await navigator.clipboard.writeText(revealedApiKey);
    toast.success('API key copied');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Website & booking site</CardTitle>
        <p className="text-sm text-stone-500">
          Host a template on our subdomain, or use your own site with API key access.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-2 block">Hosting mode</Label>
          <Select value={hostingMode} onValueChange={(v) => handleModeChange(v as WebsiteHostingMode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-stone-500">
            {MODE_OPTIONS.find((o) => o.value === hostingMode)?.description}
          </p>
        </div>

        {hostingMode === 'subdomain' && (
          <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <LayoutTemplate className="h-4 w-4" />
              Choose a site template
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {data.siteTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateChange(template.id)}
                  className={cn(
                    'rounded-lg border bg-white p-4 text-left transition-colors hover:border-brand-300',
                    website.siteTemplate === template.id
                      ? 'border-brand-500 ring-2 ring-brand-100'
                      : 'border-stone-200',
                  )}
                >
                  <p className="font-medium text-stone-900">{template.name}</p>
                  <p className="mt-1 text-xs text-stone-500">{template.description}</p>
                </button>
              ))}
            </div>
            <div>
              <Label>Your subdomain</Label>
              <p className="mt-1 text-sm font-medium text-brand-700">{subdomainPreview}</p>
            </div>
          </div>
        )}

        {(hostingMode === 'external_api' || data.apiAccess.apiKeyConfigured) && (
          <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <Key className="h-4 w-4" />
              API access for your site
            </div>

            <div className="space-y-2">
              <Label>API key</Label>
              <div className="flex flex-wrap items-stretch gap-2">
                <div
                  className={cn(
                    'flex min-h-10 min-w-0 flex-1 items-center rounded-md border border-dashed bg-white px-3 py-2 font-mono text-sm',
                    data.apiAccess.apiKeyConfigured
                      ? 'border-stone-300 text-stone-700'
                      : 'border-stone-300 text-stone-400',
                  )}
                >
                  {revealedApiKey ? (
                    <span className="break-all">{revealedApiKey}</span>
                  ) : data.apiAccess.apiKeyConfigured ? (
                    `${data.apiAccess.apiKeyPrefix}…`
                  ) : (
                    'No key generated yet'
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => regenerateMutation.mutate()}
                  disabled={regenerateMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4" />
                  {data.apiAccess.apiKeyConfigured ? 'Regenerate key' : 'Generate key'}
                </Button>
                {revealedApiKey && (
                  <Button variant="outline" size="sm" className="shrink-0" onClick={copyApiKey}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                )}
              </div>
              {revealedApiKey && (
                <p className="text-xs font-medium text-amber-800">
                  Copy your API key now — it will not be shown again.
                </p>
              )}
            </div>

            <div>
              <Label>Allowed origins (whitelist)</Label>
              <Textarea
                className="mt-1 bg-white font-mono text-xs"
                rows={4}
                value={originsText}
                onChange={(e) => setOriginsDraft(e.target.value)}
                onBlur={saveOrigins}
                placeholder={'https://book.yourbusiness.com\nhttps://www.yourbusiness.com'}
              />
              <p className="mt-1 text-xs text-stone-500">
                One origin per line. Browser requests from other domains will be rejected when using your API key.
              </p>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
                <Plug className="h-4 w-4" />
                Public API
              </div>
              <code className="block break-all text-xs text-stone-600">{data.publicApiBaseUrl}</code>
              <p className="mt-2 text-xs text-stone-500">
                Send <code className="text-stone-700">X-Api-Key: your_key</code> with requests to{' '}
                {data.publicApiBaseUrl}/organizations/{data.organizationSlug}/…
              </p>
            </div>
          </div>
        )}

        {website.deployedSiteUrl && hostingMode === 'subdomain' && (
          <div>
            <Label>Live site URL</Label>
            <a
              href={website.deployedSiteUrl}
              className="mt-1 flex items-center gap-1 text-sm text-brand-600 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {website.deployedSiteUrl}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Label>Status</Label>
          <Badge>{website.deploymentStatus}</Badge>
          {website.lastDeployedAt && (
            <span className="text-xs text-stone-500">Updated {formatDate(website.lastDeployedAt)}</span>
          )}
        </div>

        {updateMutation.isPending && <p className="text-xs text-stone-500">Saving…</p>}
      </CardContent>
    </Card>
  );
}
