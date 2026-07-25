import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatTrialCountdown, getTrialRemainingParts } from '@/lib/trial';
import type { Organization } from '@/types/api';

interface TrialActiveBannerProps {
  organization: Pick<Organization, 'id' | 'trialEndsAt'>;
  isPlatformOwner?: boolean;
}

export function TrialActiveBanner({ organization, isPlatformOwner }: TrialActiveBannerProps) {
  const endsAt = organization.trialEndsAt;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  const parts = getTrialRemainingParts(endsAt, nowMs);
  const countdown = formatTrialCountdown(parts);

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1.5 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950 sm:flex-nowrap sm:justify-between sm:text-left dark:bg-amber-600 dark:text-amber-50">
      <span className="flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
        You&apos;re on a free trial
        <span className="font-normal text-amber-900/90 dark:text-amber-100/90">
          — {countdown} left
        </span>
      </span>
      {!isPlatformOwner && (
        <Button
          asChild
          size="sm"
          className="h-7 shrink-0 rounded-full bg-amber-950 px-3 text-xs font-semibold text-amber-50 hover:bg-amber-900 dark:bg-amber-50 dark:text-amber-950 dark:hover:bg-white"
        >
          <Link to={`/orgs/${organization.id}/settings/plan`}>View plans</Link>
        </Button>
      )}
    </div>
  );
}
