import { Badge } from '@/components/ui/badge';
import type { CustomWebsiteRequestStatus } from '@/types/api';

const STATUS_VARIANTS: Record<CustomWebsiteRequestStatus, 'default' | 'success' | 'warning' | 'secondary'> = {
  open: 'warning',
  in_progress: 'default',
  done: 'success',
  closed: 'secondary',
};

const STATUS_LABELS: Record<CustomWebsiteRequestStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  closed: 'Closed',
};

export function CustomWebsiteStatusBadge({ status }: { status: CustomWebsiteRequestStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
