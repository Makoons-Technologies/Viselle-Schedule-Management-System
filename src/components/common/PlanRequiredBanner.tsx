import { CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { Organization } from '@/types/api';

interface PlanRequiredBannerProps {
  organization: Pick<Organization, 'id'>;
  /** Staff cannot complete Checkout — point them at the owner instead. */
  isStaff?: boolean;
  isPlatformOwner?: boolean;
}

export function PlanRequiredBanner({
  organization,
  isStaff,
  isPlatformOwner,
}: PlanRequiredBannerProps) {
  const message = isStaff
    ? 'This salon needs an active subscription before you can make changes. Ask the organization owner to choose a plan.'
    : isPlatformOwner
      ? 'This organization has no linked subscription — the owner must choose a plan to unlock salon use.'
      : 'Choose a plan to continue to use Viselle.';

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1.5 bg-amber-700 px-4 py-2 text-center text-sm font-medium text-white sm:flex-nowrap sm:justify-between sm:text-left">
      <span className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
        {message}
      </span>
      {!isStaff && !isPlatformOwner && (
        <Button
          asChild
          size="sm"
          className="h-7 shrink-0 rounded-full bg-white px-3 text-xs font-semibold text-amber-900 hover:bg-amber-50"
        >
          <Link to={`/orgs/${organization.id}/settings/plan`}>Choose a plan</Link>
        </Button>
      )}
    </div>
  );
}
