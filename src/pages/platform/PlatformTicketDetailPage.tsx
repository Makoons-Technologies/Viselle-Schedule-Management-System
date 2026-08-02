import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { Panel } from '@/components/common/Panel';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge';
import { TicketTypeBadge } from '@/components/support/TicketTypeBadge';
import { TicketThread } from '@/components/support/TicketThread';
import {
  SUPPORT_TICKET_STATUS_LABELS,
  SUPPORT_TICKET_STATUSES,
} from '@/components/support/ticket-types';
import type { SupportAttachmentUpload, SupportTicketAgentBrief, SupportTicketStatus } from '@/types/api';
import { AttachmentList } from '@/components/support/AttachmentExtras';

export function PlatformTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [brief, setBrief] = useState<SupportTicketAgentBrief | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets', 'inbox', 'detail', ticketId],
    queryFn: () => ownerApi.getSupportTicket(ticketId!),
    enabled: !!ticketId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['support-tickets', 'inbox', 'detail', ticketId] });
    queryClient.invalidateQueries({ queryKey: ['support-tickets', 'inbox'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: SupportTicketStatus) => ownerApi.updateSupportTicketStatus(ticketId!, status),
    onSuccess: () => {
      toast.success('Status updated');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const replyMutation = useMutation({
    mutationFn: (data: {
      body: string;
      isInternalNote: boolean;
      attachments?: SupportAttachmentUpload[];
    }) => ownerApi.replySupportTicket(ticketId!, data),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  });

  const briefMutation = useMutation({
    mutationFn: () => ownerApi.prepareSupportTicketAgentBrief({ ticketIds: [ticketId!] }),
    onSuccess: (result) => {
      setBrief(result);
      invalidate();
      toast.success('Agent brief ready');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !data) return <LoadingState />;

  const { ticket, messages } = data;

  async function copyPrompt() {
    if (!brief?.prompt) return;
    try {
      await navigator.clipboard.writeText(brief.prompt);
      toast.success('Agent prompt copied');
    } catch {
      toast.error('Could not copy — select the text manually');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsBackHeader title="Ticket" backTo="/platform/support" />

      <Panel className="p-4 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{ticket.subject}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <TicketTypeBadge type={ticket.type} />
            <TicketStatusBadge status={ticket.status} />
            <Select value={ticket.status} onValueChange={(v) => statusMutation.mutate(v as SupportTicketStatus)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_TICKET_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {SUPPORT_TICKET_STATUS_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={briefMutation.isPending}
              onClick={() => briefMutation.mutate()}
            >
              <Bot className="h-4 w-4" />
              Send to agent
            </Button>
          </div>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          From {ticket.creatorEmail} ({ticket.creatorRole.replace('_', ' ')}) ·{' '}
          {new Date(ticket.createdAt).toLocaleString()}
          {ticket.linearIssueIdentifier ? (
            <>
              {' '}
              ·{' '}
              <a
                href={ticket.linearIssueUrl || undefined}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {ticket.linearIssueIdentifier}
              </a>
            </>
          ) : null}
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm text-stone-800 dark:text-stone-100">{ticket.body}</p>
        <AttachmentList attachments={ticket.attachments} />
      </Panel>

      <TicketThread
        messages={messages}
        currentUserEmail={user?.email}
        onSubmit={(body, isInternalNote, attachments) =>
          replyMutation.mutate({ body, isInternalNote, attachments })
        }
        isSubmitting={replyMutation.isPending}
        showInternalNoteToggle
      />

      <Dialog open={!!brief} onOpenChange={(open) => !open && setBrief(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send to Cursor agent</DialogTitle>
            <DialogDescription>
              Copy this prompt into a new Cursor Agent chat. Status is In Progress
              {brief?.linearSynced ? '; Linear issue mirrored' : ''}.
            </DialogDescription>
          </DialogHeader>
          <Textarea readOnly value={brief?.prompt ?? ''} rows={14} className="font-mono text-xs" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={copyPrompt}>Copy prompt</Button>
            <Button variant="outline" onClick={() => setBrief(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
