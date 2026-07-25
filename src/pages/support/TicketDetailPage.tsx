import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supportApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { Panel } from '@/components/common/Panel';
import { LoadingState } from '@/components/common/LoadingState';
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge';
import { TicketTypeBadge } from '@/components/support/TicketTypeBadge';
import { TicketThread } from '@/components/support/TicketThread';

export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets', 'mine', ticketId],
    queryFn: () => supportApi.getMyTicket(ticketId!),
    enabled: !!ticketId,
  });

  const replyMutation = useMutation({
    mutationFn: (body: string) => supportApi.replyToTicket(ticketId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets', 'mine', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets', 'mine'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !data) return <LoadingState />;

  const { ticket, messages } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsBackHeader title="Ticket" backTo="/support" />

      <Panel className="p-4 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{ticket.subject}</h1>
          <div className="flex items-center gap-2">
            <TicketTypeBadge type={ticket.type} />
            <TicketStatusBadge status={ticket.status} />
          </div>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Submitted {new Date(ticket.createdAt).toLocaleString()}
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm text-stone-800 dark:text-stone-100">{ticket.body}</p>
      </Panel>

      <TicketThread
        messages={messages}
        currentUserEmail={user?.email}
        onSubmit={(body) => replyMutation.mutate(body)}
        isSubmitting={replyMutation.isPending}
      />
    </div>
  );
}
