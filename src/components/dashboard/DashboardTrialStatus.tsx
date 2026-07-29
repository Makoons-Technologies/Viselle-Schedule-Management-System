import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { useOrgId } from '@/hooks/useOrgId';
import { orgApi } from '@/lib/api';
import {
  formatTrialCountdown,
  getTrialRemainingParts,
  isOrgInActiveTrial,
  isOrgTrialExpired,
} from '@/lib/trial';
import { getPlatformContextFromPath, PLATFORM_CONTEXT } from '@/components/layout/platform-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Dashboard callout for trial orgs: Trial badge + live countdown (or expired notice).
 * Shares the organization query cache with OrgTrialBanner / SidebarTrialStatus.
 */
export function DashboardTrialStatus() {
  const { user } = useAuth();
  const location = useLocation();
  const { organizations, selectedOrg } = useOrg();
  const routeOrgId = useOrgId();
  const isPlatformOwner = user?.role === 'platform_owner';
  const orgIdForQuery = isPlatformOwner ? routeOrgId : user?.organizationId ?? routeOrgId;

  const { data: orgData } = useQuery({
    queryKey: ['organization', orgIdForQuery, user?.role],
    queryFn: () => orgApi.getOrganization(orgIdForQuery!),
    enabled: !!orgIdForQuery && !isPlatformOwner,
  });

  const contextValue = isPlatformOwner ? getPlatformContextFromPath(location.pathname) : null;
  const selectedOrgFromContext =
    contextValue && contextValue !== PLATFORM_CONTEXT
      ? organizations.find((o) => o.id === contextValue) ?? selectedOrg
      : null;

  const organization = isPlatformOwner ? selectedOrgFromContext : orgData?.organization ?? null;
  const endsAt = organization?.trialEndsAt ?? null;
  const active = !!organization && isOrgInActiveTrial(organization) && !!endsAt;
  const expired = !!organization && isOrgTrialExpired(organization);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !endsAt) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active, endsAt]);

  if (!organization || (!active && !expired)) return null;

  const countdown = endsAt ? formatTrialCountdown(getTrialRemainingParts(endsAt, nowMs)) : null;
  const endsAtLabel = endsAt
    ? new Date(endsAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <Card
      className={
        expired
          ? 'mb-6 border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40'
          : 'mb-6 border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40'
      }
    >
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={expired ? 'destructive' : 'warning'}>
              {expired ? 'Trial expired' : 'Trial'}
            </Badge>
            {active && countdown && (
              <span
                className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-amber-900 dark:text-amber-100"
                aria-live="polite"
              >
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {countdown} left
              </span>
            )}
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {expired
              ? 'Upgrade to unlock creating and editing. Existing data stays viewable.'
              : endsAtLabel
                ? `Your free trial ends ${endsAtLabel}.`
                : 'You are on a free trial.'}
          </p>
        </div>
        {!isPlatformOwner && (
          <Button asChild size="sm" className="w-full shrink-0 sm:w-auto">
            <Link to={`/orgs/${organization.id}/settings/plan`}>
              {expired ? 'Upgrade' : 'View plans'}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
