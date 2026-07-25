import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Code2, ExternalLink, KeyRound, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { orgApi, ownerApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface DeveloperApiSectionProps {
  orgId: string;
  data: WebsiteSettingsResponse;
}

export function DeveloperApiSection({ orgId, data }: DeveloperApiSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isPlatformOwner = user?.role === 'platform_owner';
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [originsInput, setOriginsInput] = useState(() => data.apiAccess.allowedOrigins.join('\n'));

  const isExternalApi = data.websiteSettings.hostingMode === 'external_api';

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

  const enableExternalApi = () => {
    updateMutation.mutate({ hostingMode: 'external_api' });
  };

  const saveOrigins = () => {
    const origins = originsInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    updateMutation.mutate({ hostingMode: 'external_api', allowedOrigins: origins });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Code2 className="h-4 w-4" />
          Custom website / developer API
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-stone-600 dark:text-stone-300">
          Building booking into your own website or app? Switch to <strong>External API</strong> mode to get an
          API key and call the Public Booking API directly from your own domain.
        </p>

        <Button asChild variant="outline" size="sm">
          {isExternalDocsHref(getApiDocsHref()) ? (
            <a href={getApiDocsHref()} target="_blank" rel="noreferrer">
              <BookOpen className="h-4 w-4" />
              View developer docs
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <Link to={getApiDocsHref()}>
              <BookOpen className="h-4 w-4" />
              View developer docs
            </Link>
          )}
        </Button>

        {!isExternalApi ? (
          <div>
            <Button onClick={enableExternalApi} disabled={updateMutation.isPending} variant="outline">
              Switch to External API mode
            </Button>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">External API active</Badge>
            </div>

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
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Copy this now — it won't be shown again.
                  </p>
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
                Leave empty to allow requests from any origin (not recommended for production).
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={saveOrigins} disabled={updateMutation.isPending}>
                <RefreshCw className="h-4 w-4" />
                Save allowed origins
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-stone-500 dark:text-stone-400"
              onClick={() => updateMutation.mutate({ hostingMode: 'path' })}
            >
              Switch back to included link
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
