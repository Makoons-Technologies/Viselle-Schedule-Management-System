import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { Panel } from '@/components/common/Panel';
import { LoadingState } from '@/components/common/LoadingState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge';
import { TicketThread } from '@/components/support/TicketThread';
import type { SupportTicketStatus } from '@/types/api';

const STATUS_OPTIONS: SupportTicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

export function PlatformTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    mutationFn: (data: { body: string; isInternalNote: boolean }) =>
      ownerApi.replySupportTicket(ticketId!, data),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !data) return <LoadingState />;

  const { ticket, messages } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsBackHeader title="Ticket" backTo="/platform/support" />

      <Panel className="p-4 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{ticket.subject}</h1>
          <div className="flex items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <Select value={ticket.status} onValueChange={(v) => statusMutation.mutate(v as SupportTicketStatus)}>
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
          From {ticket.creatorEmail} ({ticket.creatorRole.replace('_', ' ')}) ·{' '}
          {new Date(ticket.createdAt).toLocaleString()}
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm text-stone-800 dark:text-stone-100">{ticket.body}</p>
      </Panel>

      <TicketThread
        messages={messages}
        currentUserEmail={user?.email}
        onSubmit={(body, isInternalNote) => replyMutation.mutate({ body, isInternalNote })}
        isSubmitting={replyMutation.isPending}
        showInternalNoteToggle
      />
    </div>
  );
}
