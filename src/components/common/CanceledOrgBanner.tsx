import { Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { Organization } from '@/types/api';
import { ORG_CANCELED_MESSAGE, ORG_CANCELED_STAFF_MESSAGE } from '@/lib/trial';

interface CanceledOrgBannerProps {
  organization: Pick<Organization, 'id'>;
  isStaff?: boolean;
  isPlatformOwner?: boolean;
}

export function CanceledOrgBanner({
  organization,
  isStaff,
  isPlatformOwner,
}: CanceledOrgBannerProps) {
  const message = isStaff
    ? ORG_CANCELED_STAFF_MESSAGE
    : isPlatformOwner
      ? 'This organization is canceled. The owner must reactivate billing before salon use.'
      : ORG_CANCELED_MESSAGE;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1.5 bg-red-700 px-4 py-2 text-center text-sm font-medium text-white sm:flex-nowrap sm:justify-between sm:text-left">
      <span className="flex items-center gap-2">
        <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />
        {message}
      </span>
      {!isStaff && !isPlatformOwner && (
        <Button
          asChild
          size="sm"
          className="h-7 shrink-0 rounded-full bg-white px-3 text-xs font-semibold text-red-800 hover:bg-red-50"
        >
          <Link to={`/orgs/${organization.id}/settings/plan`}>Reactivate</Link>
        </Button>
      )}
    </div>
  );
}
