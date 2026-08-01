import { Badge } from '@/components/ui/badge';
import { SUPPORT_TICKET_STATUS_LABELS } from '@/components/support/ticket-types';
import type { SupportTicketStatus } from '@/types/api';

const STATUS_VARIANTS: Record<SupportTicketStatus, 'default' | 'success' | 'warning' | 'secondary'> = {
  open: 'warning',
  in_progress: 'default',
  qa_ready: 'warning',
  done: 'success',
  canceled: 'secondary',
};

export function TicketStatusBadge({ status }: { status: SupportTicketStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{SUPPORT_TICKET_STATUS_LABELS[status]}</Badge>;
}
