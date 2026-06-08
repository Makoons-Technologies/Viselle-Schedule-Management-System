import { Badge } from '@/components/ui/badge';
import type { AppointmentStatus, BillingStatus, OrganizationStatus } from '@/types/api';

const appointmentVariants: Record<AppointmentStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  scheduled: 'secondary',
  confirmed: 'success',
  cancelled: 'destructive',
  completed: 'default',
  no_show: 'warning',
  rescheduled: 'warning',
};

const orgVariants: Record<OrganizationStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
  suspended: 'warning',
  trial: 'default',
  cancelled: 'destructive',
};

const billingVariants: Record<BillingStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  past_due: 'warning',
  failed: 'destructive',
  cancelled: 'destructive',
  trial: 'default',
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={appointmentVariants[status]}>{status.replace('_', ' ')}</Badge>;
}

export function OrganizationStatusBadge({ status }: { status: OrganizationStatus }) {
  return <Badge variant={orgVariants[status]}>{status}</Badge>;
}

export function BillingStatusBadge({ status }: { status: BillingStatus }) {
  return <Badge variant={billingVariants[status]}>{status.replace('_', ' ')}</Badge>;
}
