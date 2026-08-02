import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { Panel } from '@/components/common/Panel';
import { LoadingState } from '@/components/common/LoadingState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomWebsiteStatusBadge } from '@/components/customWebsites/CustomWebsiteStatusBadge';
import { TicketThread } from '@/components/support/TicketThread';
import type { CustomWebsiteRequestStatus, SupportTicketMessage } from '@/types/api';

const STATUS_OPTIONS: CustomWebsiteRequestStatus[] = ['open', 'in_progress', 'done', 'closed'];

export function PlatformCustomWebsiteDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['custom-website-requests', 'inbox', 'detail', requestId],
    queryFn: () => ownerApi.getCustomWebsiteRequest(requestId!),
    enabled: !!requestId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['custom-website-requests', 'inbox', 'detail', requestId] });
    queryClient.invalidateQueries({ queryKey: ['custom-website-requests', 'inbox'] });
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

  if (isLoading || !data) return <LoadingState />;

  const { request, notes } = data;
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
              <dd className="font-mono text-xs">{request.organizationId}</dd>
            </div>
          )}
        </dl>
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
