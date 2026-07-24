import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { contactPath } from '@/lib/contact';
import type { Organization } from '@/types/api';

interface TrialExpiredBannerProps {
  organization: Pick<Organization, 'slug'>;
  isPlatformOwner?: boolean;
}

export function TrialExpiredBanner({ organization, isPlatformOwner }: TrialExpiredBannerProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1.5 bg-red-600 px-4 py-2 text-center text-sm font-medium text-white sm:flex-nowrap sm:justify-between sm:text-left">
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        Your trial has expired. You can still view your existing data, but creating or changing
        anything is locked{isPlatformOwner ? ' for this organization' : ''} until you upgrade.
      </span>
      {!isPlatformOwner && (
        <Button
          asChild
          size="sm"
          className="h-7 shrink-0 rounded-full bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
        >
          <Link to={contactPath({ interest: 'upgrade', slug: organization.slug })} target="_blank" rel="noopener noreferrer">
            Upgrade / contact us
          </Link>
        </Button>
      )}
    </div>
  );
}
