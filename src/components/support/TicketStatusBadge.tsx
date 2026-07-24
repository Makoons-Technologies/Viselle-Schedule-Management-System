import { Badge } from '@/components/ui/badge';
import type { SupportTicketStatus } from '@/types/api';

const STATUS_VARIANTS: Record<SupportTicketStatus, 'default' | 'success' | 'warning' | 'secondary'> = {
  open: 'warning',
  in_progress: 'default',
  resolved: 'success',
  closed: 'secondary',
};

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function TicketStatusBadge({ status }: { status: SupportTicketStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
