import { useEffect, useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { orgApi, ownerApi } from '@/lib/api';
import { contactPath } from '@/lib/contact';
import { getSubdomainBookingUrl } from '@/lib/public-booking';
import { cn, slugify } from '@/lib/utils';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SiteTemplate, WebsiteSettingsResponse } from '@/types/api';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved' | 'error';

interface HostedSubdomainSectionProps {
  orgId: string;
  data: WebsiteSettingsResponse;
  isPlatformOwner: boolean;
  trialExpired: boolean;
  updatePending: boolean;
  onUpdate: (payload: {
    hostingMode: 'path' | 'subdomain';
    siteTemplate?: SiteTemplate | null;
    subdomain?: string;
  }) => void;
}

export function HostedSubdomainSection({
  orgId,
  data,
  isPlatformOwner,
  trialExpired,
  updatePending,
  onUpdate,
}: HostedSubdomainSectionProps) {
  const website = data.websiteSettings;
  const hostingMode = website.hostingMode ?? 'path';
  const defaultSubdomain = data.defaultSubdomain || data.organizationSlug;
  const [subdomainDraft, setSubdomainDraft] = useState(
    website.subdomain || data.effectiveSubdomain || defaultSubdomain,
  );
  const [status, setStatus] = useState<SlugStatus>('idle');

  useEffect(() => {
    setSubdomainDraft(website.subdomain || data.effectiveSubdomain || defaultSubdomain);
  }, [website.subdomain, data.effectiveSubdomain, defaultSubdomain]);

  useEffect(() => {
    if (!data.subdomainHostingEnabled) return;

    const normalized = slugify(subdomainDraft);
    if (normalized.length < 2) {
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('checking');
    const timer = window.setTimeout(() => {
      const check = isPlatformOwner
        ? ownerApi.checkSubdomainAvailable(orgId, normalized)
        : orgApi.checkSubdomainAvailable(orgId, normalized);

      check
        .then((result) => {
          if (cancelled) return;
          if (result.available) {
            setStatus('available');
            return;
          }
          if (result.reason === 'reserved') setStatus('reserved');
          else if (result.reason === 'invalid') setStatus('invalid');
          else setStatus('taken');
        })
        .catch(() => {
          if (!cancelled) setStatus('error');
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [subdomainDraft, data.subdomainHostingEnabled, isPlatformOwner, orgId]);

  const previewUrl = getSubdomainBookingUrl(
    slugify(subdomainDraft) || defaultSubdomain,
    data.subdomainBaseDomain,
  );
  const liveUrl =
    data.subdomainUrl ||
    getSubdomainBookingUrl(data.effectiveSubdomain || defaultSubdomain, data.subdomainBaseDomain);

  const normalizedDraft = slugify(subdomainDraft) || defaultSubdomain;
  const currentLabel = website.subdomain || data.effectiveSubdomain || defaultSubdomain;
  const canSave =
    status === 'available' &&
    normalizedDraft !== currentLabel &&
    !updatePending &&
    !trialExpired;

  const saveSubdomain = () => {
    onUpdate({
      hostingMode: 'subdomain',
      siteTemplate: website.siteTemplate ?? data.siteTemplates[0]?.id ?? 'classic',
      subdomain: normalizedDraft,
    });
  };

  return (
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
            {defaultSubdomain}.{data.subdomainBaseDomain}
          </span>
          . Defaults to your business name/slug — or pick a custom label. Same booking page, shorter branded
          address.
        </p>

        {data.subdomainHostingEnabled ? (
          <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">Subdomain enabled</Badge>
              {hostingMode === 'subdomain' && <Badge>Live on subdomain</Badge>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hosted-subdomain">Subdomain</Label>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="hosted-subdomain"
                  value={subdomainDraft}
                  onChange={(e) => setSubdomainDraft(e.target.value.toLowerCase())}
                  disabled={trialExpired || updatePending}
                  className="font-mono sm:max-w-xs"
                  autoComplete="off"
                  spellCheck={false}
                />
                <span className="shrink-0 text-sm text-stone-500 dark:text-stone-400">
                  .{data.subdomainBaseDomain}
                </span>
              </div>
              <p
                className={cn(
                  'text-xs',
                  status === 'available' && 'text-emerald-600 dark:text-emerald-400',
                  (status === 'taken' || status === 'reserved' || status === 'invalid') &&
                    'text-rose-600 dark:text-rose-400',
                  status === 'checking' && 'text-stone-500',
                  status === 'error' && 'text-amber-600 dark:text-amber-400',
                )}
              >
                {status === 'checking' && 'Checking availability…'}
                {status === 'available' && 'This subdomain is available'}
                {status === 'taken' && 'That subdomain is already taken'}
                {status === 'reserved' && 'That subdomain is reserved'}
                {status === 'invalid' && 'Use 2–63 characters: lowercase letters, numbers, and hyphens'}
                {status === 'error' && 'Could not check availability — try again'}
                {status === 'idle' && `Preview: ${previewUrl.replace(/^https?:\/\//, '')}`}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Default from your business:{' '}
                <button
                  type="button"
                  className="font-mono text-brand-700 hover:underline dark:text-brand-300"
                  onClick={() => setSubdomainDraft(defaultSubdomain)}
                  disabled={trialExpired}
                >
                  {defaultSubdomain}
                </button>
              </p>
            </div>

            {hostingMode === 'subdomain' && (
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300">{liveUrl}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {hostingMode !== 'subdomain' ? (
                <TrialLockedControl locked={trialExpired}>
                  <Button
                    onClick={saveSubdomain}
                    disabled={updatePending || trialExpired || status === 'checking' || status === 'taken' || status === 'reserved' || status === 'invalid'}
                  >
                    Switch to hosted subdomain
                  </Button>
                </TrialLockedControl>
              ) : (
                <>
                  <Button asChild variant="outline">
                    <a href={liveUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open subdomain site
                    </a>
                  </Button>
                  <TrialLockedControl locked={trialExpired}>
                    <Button variant="secondary" onClick={saveSubdomain} disabled={!canSave}>
                      Save subdomain
                    </Button>
                  </TrialLockedControl>
                </>
              )}
            </div>

            {hostingMode === 'subdomain' && (
              <TrialLockedControl locked={trialExpired}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-stone-500 dark:text-stone-400"
                  onClick={() =>
                    onUpdate({
                      hostingMode: 'path',
                      siteTemplate: website.siteTemplate,
                    })
                  }
                  disabled={trialExpired}
                >
                  Use included link instead
                </Button>
              </TrialLockedControl>
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
  );
}
