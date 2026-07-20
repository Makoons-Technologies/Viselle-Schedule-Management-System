import { Link } from 'react-router-dom';
import { helperTextClass } from '@/components/common/Panel';
import { useOrgAdminAccess } from '@/hooks/useOrgAdminAccess';
import { getCardUnavailableHint, isCardCheckoutReady } from '@/lib/stripe-connect-hint';
import { cn } from '@/lib/utils';
import type { StripeConnectStatus } from '@/types/api';

interface CardUnavailableHintProps {
  orgId: string;
  connectStatus: StripeConnectStatus | undefined;
  className?: string;
}

export function CardUnavailableHint({ orgId, connectStatus, className }: CardUnavailableHintProps) {
  const isAdmin = useOrgAdminAccess(orgId);

  if (isCardCheckoutReady(connectStatus)) return null;

  const hint = getCardUnavailableHint(connectStatus, isAdmin);

  return (
    <p className={cn(helperTextClass, className)}>
      {hint}
      {isAdmin ? (
        <>
          {' '}
          <Link
            to={`/orgs/${orgId}/settings/payments`}
            className="font-medium text-brand-600 underline underline-offset-2 dark:text-brand-400"
          >
            Open Payments settings
          </Link>
        </>
      ) : null}
    </p>
  );
}
