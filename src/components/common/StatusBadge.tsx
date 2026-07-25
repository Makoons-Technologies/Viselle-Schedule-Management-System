import { Badge } from '@/components/ui/badge';
import type {
  BillingStatus,
  OrganizationStatus,
  PaymentStatus,
  VisitStatus,
  WebsiteHostingMode,
} from '@/types/api';

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

const visitVariants: Record<VisitStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  scheduled: 'secondary',
  arrived: 'success',
  missed: 'warning',
  cancelled: 'destructive',
};

const paymentVariants: Record<PaymentStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  unpaid: 'secondary',
  paid: 'success',
  refunded: 'warning',
};

export function AppointmentStatusBadge({
  visitStatus,
  paymentStatus,
  recurringAppointmentRuleId,
  recurringSeriesActive = true,
}: {
  visitStatus: VisitStatus;
  paymentStatus: PaymentStatus;
  recurringAppointmentRuleId?: string | null;
  recurringSeriesActive?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {recurringAppointmentRuleId && recurringSeriesActive && visitStatus === 'scheduled' && (
        <Badge variant="default">recurring</Badge>
      )}
      <Badge variant={visitVariants[visitStatus]}>{visitStatus.replace('_', ' ')}</Badge>
      {visitStatus === 'arrived' && (
        <Badge variant={paymentVariants[paymentStatus]}>{paymentStatus}</Badge>
      )}
    </span>
  );
}

export function OrganizationStatusBadge({ status }: { status: OrganizationStatus }) {
  return <Badge variant={orgVariants[status]}>{status}</Badge>;
}

export function BillingStatusBadge({ status }: { status: BillingStatus }) {
  return <Badge variant={billingVariants[status]}>{status.replace('_', ' ')}</Badge>;
}

const hostingVariants: Record<
  'free' | 'subdomain' | 'custom_website' | 'external_api',
  'default' | 'success' | 'warning' | 'secondary'
> = {
  free: 'secondary',
  subdomain: 'success',
  custom_website: 'warning',
  external_api: 'default',
};

export function WebsiteHostingBadge({
  hostingMode,
  customWebsiteRequested,
}: {
  hostingMode?: WebsiteHostingMode | null;
  customWebsiteRequested?: boolean;
}) {
  if (customWebsiteRequested) {
    return <Badge variant={hostingVariants.custom_website}>Custom website</Badge>;
  }

  switch (hostingMode) {
    case 'subdomain':
      return <Badge variant={hostingVariants.subdomain}>Hosted subdomain</Badge>;
    case 'external_api':
      return <Badge variant={hostingVariants.external_api}>3rd party + API</Badge>;
    case 'path':
    case 'none':
    default:
      return <Badge variant={hostingVariants.free}>Free booking link</Badge>;
  }
}
