import { Badge } from '@/components/ui/badge';
import type { SupportTicketType } from '@/types/api';
import { SUPPORT_TICKET_TYPE_LABELS } from '@/components/support/ticket-types';

export function TicketTypeBadge({ type }: { type: SupportTicketType }) {
  return <Badge variant="secondary">{SUPPORT_TICKET_TYPE_LABELS[type]}</Badge>;
}
