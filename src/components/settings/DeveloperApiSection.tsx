import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, ChevronDown, Code2, Copy, ExternalLink, KeyRound, RefreshCw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { orgApi, ownerApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { WebsiteSettingsResponse } from '@/types/api';

/** Public (no-auth) docs page. Override with absolute URL via VITE_PUBLIC_API_DOCS_URL if needed. */
const DEFAULT_DOCS_PATH = '/docs/api';

function getApiDocsHref(): string {
  return (import.meta.env.VITE_PUBLIC_API_DOCS_URL as string | undefined) || DEFAULT_DOCS_PATH;
}

function isExternalDocsHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function DocsButton() {
  const href = getApiDocsHref();
  if (isExternalDocsHref(href)) {
    return (
      <Button asChild variant="outline" size="sm">
        <a href={href} target="_blank" rel="noreferrer">
          <BookOpen className="h-4 w-4" />
          View developer docs
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="sm">
      <Link to={href}>
        <BookOpen className="h-4 w-4" />
        View developer docs
      </Link>
    </Button>
  );
}

interface DeveloperApiSectionProps {
  orgId: string;
  data: WebsiteSettingsResponse;
  /** Render without a card wrapper so this can sit at the top of another section. */
  embedded?: boolean;
  /** Shareable custom-site URL controls. Shown below API fields. */
  customUrlSlot?: ReactNode;
  /** Start expanded. Default is closed so salon owners are not dropped into API setup. */
  defaultOpen?: boolean;
}

export function DeveloperApiSection({
  orgId,
  data,
  embedded = false,
  customUrlSlot,
  defaultOpen,
}: DeveloperApiSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isPlatformOwner = user?.role === 'platform_owner';
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [originsInput, setOriginsInput] = useState(() => data.apiAccess.allowedOrigins.join('\n'));

  useEffect(() => {
    setOriginsInput(data.apiAccess.allowedOrigins.join('\n'));
  }, [data.apiAccess.allowedOrigins]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['website', orgId] });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof orgApi.updateWebsite>[1]) =>
      isPlatformOwner ? ownerApi.updateWebsite(orgId, payload) : orgApi.updateWebsite(orgId, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => (isPlatformOwner ? ownerApi.regenerateWebsiteApiKey(orgId) : orgApi.regenerateWebsiteApiKey(orgId)),
    onSuccess: (result) => {
      setRevealedKey(result.apiKey);
      invalidate();
      toast.success('New API key generated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveOrigins = () => {
    const origins = originsInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    updateMutation.mutate({ allowedOrigins: origins });
  };

  const startOpen = defaultOpen ?? false;

  const body = (
    <details className="group space-y-4" open={startOpen ? true : undefined}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-1 hover:bg-stone-50 marker:content-none dark:hover:bg-stone-800/60 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 text-sm font-medium text-stone-900 dark:text-stone-50">
            <Code2 className="h-4 w-4 shrink-0" />
            Developer API
          </span>
          {data.apiAccess.apiKeyConfigured && <Badge variant="success">Key issued</Badge>}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 pt-2">
      <div className="space-y-3">
        <p className="text-sm text-stone-600 dark:text-stone-300">
          The Public Booking API is included with every org. Generate a key to book from your own site — this does
          not change the Viselle booking page or a custom website we built.
        </p>
        <DocsButton />
      </div>

      <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
        <div>
          <Label>Base URL</Label>
          <code className="mt-1 block break-all rounded-md border border-stone-200 bg-white px-3 py-2 text-xs text-brand-700 dark:border-stone-700 dark:bg-stone-900 dark:text-brand-300">
            {data.publicApiBaseUrl}
          </code>
        </div>

        <div>
          <Label>API key</Label>
          {revealedKey ? (
            <div className="mt-1 space-y-1">
              <code className="block break-all rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                {revealedKey}
              </code>
              <p className="text-xs text-amber-700 dark:text-amber-400">Copy this now — it won't be shown again.</p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
              {data.apiAccess.apiKeyConfigured
                ? `${data.apiAccess.apiKeyPrefix}••••••••••••••••••••`
                : 'No key generated yet.'}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
          >
            <KeyRound className="h-4 w-4" />
            {data.apiAccess.apiKeyConfigured ? 'Regenerate key' : 'Generate key'}
          </Button>
        </div>

        <div>
          <Label>Allowed origins (one per line)</Label>
          <Textarea
            rows={3}
            placeholder="https://www.your-salon.com"
            value={originsInput}
            onChange={(e) => setOriginsInput(e.target.value)}
          />
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Leave empty to allow requests from any origin (not recommended for production). Localhost and demo
            origins are fine alongside your live site.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={saveOrigins}
            disabled={updateMutation.isPending}
          >
            <RefreshCw className="h-4 w-4" />
            Save allowed origins
          </Button>
        </div>
      </div>

      {customUrlSlot}
      </div>
    </details>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">{body}</CardContent>
    </Card>
  );
}

/** Compact shareable custom-site URL block for the Custom website card. */
export function CustomSiteUrlFields({
  draft,
  onDraftChange,
  onSave,
  pending,
  trialExpired,
  liveHost,
  liveUrl,
  showLive,
  fallbackHost,
  onCopy,
  description = 'If you have a custom site you use for booking through the API, set it here. This replaces the included Viselle booking page on your dashboard.',
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  pending: boolean;
  trialExpired: boolean;
  liveHost: string;
  liveUrl: string;
  showLive: boolean;
  fallbackHost?: string;
  onCopy: () => void;
  description?: string;
}) {
  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/50 dark:bg-brand-950/20">
      <div>
        <Label htmlFor="custom-site-url">Your website URL</Label>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{description}</p>
        <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
          <Input
            id="custom-site-url"
            type="url"
            placeholder="https://www.your-salon.com"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            disabled={trialExpired || pending}
            autoComplete="url"
            className="min-w-0 flex-1 font-mono text-sm"
          />
          <Button size="sm" className="shrink-0" onClick={onSave} disabled={trialExpired || pending}>
            Save URL
          </Button>
        </div>
        {!showLive && fallbackHost && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            No custom URL saved yet — dashboard falls back to the included page until you add one. Fallback:{' '}
            <span className="font-mono">{fallbackHost}</span>
          </p>
        )}
      </div>

      {showLive && (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
          <code className="block min-w-0 flex-1 break-all rounded-md border border-stone-200 bg-white px-3 py-2 text-xs text-brand-700 dark:border-stone-700 dark:bg-stone-900 dark:text-brand-300 sm:text-sm">
            {liveHost}
          </code>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={onCopy}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <a href={liveUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
