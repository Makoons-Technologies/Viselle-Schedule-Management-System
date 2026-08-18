import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { Panel } from '@/components/common/Panel';
import { LoadingState } from '@/components/common/LoadingState';
import { WebsiteHostingBadge } from '@/components/common/StatusBadge';
import { CustomWebsiteStatusBadge } from '@/components/customWebsites/CustomWebsiteStatusBadge';
import { TicketThread } from '@/components/support/TicketThread';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { displayBookingHost, getShareableBookingLink } from '@/lib/public-booking';
import type { CustomWebsiteRequestStatus, SupportTicketMessage } from '@/types/api';

const STATUS_OPTIONS: CustomWebsiteRequestStatus[] = ['open', 'in_progress', 'done', 'closed'];

function normalizePublicHttpsUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (/localhost|127\.0\.0\.1/i.test(parsed.hostname)) return null;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function PlatformCustomWebsiteDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [liveUrlDraft, setLiveUrlDraft] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['custom-website-requests', 'inbox', 'detail', requestId],
    queryFn: () => ownerApi.getCustomWebsiteRequest(requestId!),
    enabled: !!requestId,
  });

  const organizationId = data?.request.organizationId ?? null;

  const { data: orgData } = useQuery({
    queryKey: ['owner-org', organizationId],
    queryFn: () => ownerApi.getOrganization(organizationId!),
    enabled: !!organizationId,
  });

  const { data: websiteData } = useQuery({
    queryKey: ['website', organizationId, 'platform_owner'],
    queryFn: () => ownerApi.getWebsite(organizationId!),
    enabled: !!organizationId,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['owner-settings', organizationId],
    queryFn: () => ownerApi.getSettings(organizationId!),
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (!websiteData) return;
    const stored = websiteData.websiteSettings.deployedSiteUrl;
    setLiveUrlDraft(stored && !/localhost|127\.0\.0\.1/i.test(stored) ? stored : '');
  }, [websiteData]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['custom-website-requests'] });
    queryClient.invalidateQueries({ queryKey: ['website', organizationId] });
    queryClient.invalidateQueries({ queryKey: ['owner-settings', organizationId] });
    queryClient.invalidateQueries({ queryKey: ['org-plan', organizationId] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: CustomWebsiteRequestStatus) =>
      ownerApi.updateCustomWebsiteRequestStatus(requestId!, status),
    onSuccess: () => {
      toast.success('Status updated');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const noteMutation = useMutation({
    mutationFn: (body: string) => ownerApi.addCustomWebsiteRequestNote(requestId!, body),
    onSuccess: () => {
      toast.success('Note added');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !requestId) {
        throw new Error('This request is not attached to an organization yet.');
      }
      const url = normalizePublicHttpsUrl(liveUrlDraft);
      if (!url) {
        throw new Error('Enter a public https URL before going live.');
      }
      const alreadyDone = data?.request.status === 'done';
      await ownerApi.updateSettings(organizationId, {
        externalApiEnabled: true,
        subdomainHostingEnabled: false,
      });
      await ownerApi.updateWebsite(organizationId, {
        hostingMode: 'external_api',
        deployedSiteUrl: url,
      });
      if (!alreadyDone) {
        await ownerApi.updateCustomWebsiteRequestStatus(requestId, 'done');
      }
      await ownerApi.addCustomWebsiteRequestNote(
        requestId,
        alreadyDone ? `Updated live URL: ${url}` : `Went live: ${url}`,
      );
      return { url, alreadyDone };
    },
    onSuccess: ({ url, alreadyDone }) => {
      toast.success(alreadyDone ? 'Live URL updated' : `Live at ${url}`);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !data) return <LoadingState />;

  const { request, notes } = data;
  const liveShare = websiteData ? getShareableBookingLink(websiteData) : null;
  const threadMessages: SupportTicketMessage[] = notes.map((note) => ({
    id: note.id,
    ticketId: note.requestId,
    authorUserId: note.authorUserId,
    authorEmail: note.authorEmail,
    isInternalNote: false,
    body: note.body,
    createdAt: note.createdAt,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsBackHeader title="Custom website request" backTo="/platform/custom-websites" />

      <Panel className="p-4 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{request.businessName}</h1>
          <div className="flex items-center gap-2">
            <CustomWebsiteStatusBadge status={request.status} />
            <Select
              value={request.status}
              onValueChange={(v) => statusMutation.mutate(v as CustomWebsiteRequestStatus)}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {request.contactName} · {request.contactEmail} · {new Date(request.createdAt).toLocaleString()}
        </p>
        <dl className="mt-3 grid gap-2 text-sm text-stone-700 dark:text-stone-200 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-400">Source</dt>
            <dd className="capitalize">{request.source.replace('_', ' ')}</dd>
          </div>
          {request.organizationId && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-400">Organization</dt>
              <dd>
                <Link
                  to={`/platform/organizations/${request.organizationId}/settings`}
                  className="text-brand-700 hover:underline dark:text-brand-300"
                >
                  {orgData?.organization.name ?? 'Org settings'}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </Panel>

      <Panel className="p-4 sm:p-6">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Go live</h2>
        {!request.organizationId ? (
          <p className="mt-2 text-sm text-stone-500">
            This request is still on a pending signup. After the org is provisioned, come back here to set the live
            URL and turn on the Viselle custom website.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-stone-500">
              Sets the live URL, turns on Viselle custom website for the org, and marks this request Done. Until then
              they keep the included booking page.
            </p>
            {websiteData && (
              <div className="flex flex-wrap items-center gap-2">
                <WebsiteHostingBadge
                  hostingMode={websiteData.websiteSettings.hostingMode}
                  customWebsiteRequested={Boolean(settingsData?.settings.externalApiEnabled)}
                />
                <span className="text-xs text-stone-500">
                  {settingsData?.settings.externalApiEnabled
                    ? 'Viselle custom website is on'
                    : websiteData.websiteSettings.hostingMode === 'subdomain'
                      ? 'Currently on hosted subdomain'
                      : websiteData.websiteSettings.hostingMode === 'external_api'
                        ? 'Currently on org 3rd-party / API URL'
                        : 'Currently on included booking page'}
                </span>
              </div>
            )}
            <div>
              <Label htmlFor="go-live-url">Live website URL</Label>
              <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                <Input
                  id="go-live-url"
                  type="url"
                  placeholder="https://yourspa.viselle.net"
                  value={liveUrlDraft}
                  onChange={(e) => setLiveUrlDraft(e.target.value)}
                  disabled={goLiveMutation.isPending}
                  autoComplete="url"
                  className="min-w-0 flex-1 font-mono text-sm"
                />
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => goLiveMutation.mutate()}
                  disabled={goLiveMutation.isPending}
                >
                  {settingsData?.settings.externalApiEnabled ? 'Update live URL' : 'Go live'}
                </Button>
              </div>
            </div>
            {liveShare?.kind === 'custom' && (
              <p className="text-xs text-stone-500">
                Dashboard link:{' '}
                <a
                  href={liveShare.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-brand-700 hover:underline dark:text-brand-300"
                >
                  {displayBookingHost(liveShare.url)}
                </a>
              </p>
            )}
          </div>
        )}
      </Panel>

      <TicketThread
        messages={threadMessages}
        currentUserEmail={user?.email}
        onSubmit={(body) => noteMutation.mutate(body)}
        isSubmitting={noteMutation.isPending}
        allowAttachments={false}
      />
    </div>
  );
}
