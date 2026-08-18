import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Compass } from 'lucide-react';
import { orgApi } from '@/lib/api';
import { useOrgOwnerTour } from '@/context/OrgOwnerTourContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function OrgSetupChecklist({ orgId }: { orgId: string }) {
  const { eligible, start, isActive } = useOrgOwnerTour();

  const { data: orgData } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => orgApi.getOrganization(orgId),
    enabled: !!orgId,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services', orgId],
    queryFn: () => orgApi.listServices(orgId),
    enabled: !!orgId,
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId,
  });

  const availabilityQueries = useQueries({
    queries: (accountsData?.accounts ?? []).slice(0, 8).map((account) => ({
      queryKey: ['availability-rules', orgId, account.id],
      queryFn: () => orgApi.listAvailabilityRules(orgId, account.id),
      enabled: !!orgId && !!account.id,
    })),
  });

  const hasService = (servicesData?.services.length ?? 0) > 0;
  const hasHours = availabilityQueries.some((q) => (q.data?.availabilityRules.length ?? 0) > 0);
  const bookingOn = orgData?.organization.publicBookingEnabled === true;
  const live = hasService && hasHours && bookingOn;

  const items = [
    {
      id: 'services',
      done: hasService,
      label: 'Add at least one service',
      to: `/orgs/${orgId}/settings/services`,
    },
    {
      id: 'hours',
      done: hasHours,
      label: 'Set your hours',
      to: `/orgs/${orgId}/availability`,
    },
    {
      id: 'booking',
      done: bookingOn,
      label: 'Turn on your booking page',
      to: `/orgs/${orgId}/website`,
    },
  ];

  return (
    <Card className="mb-6 border-brand-200 dark:border-brand-900/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">{live ? 'You are live' : 'Go live'}</CardTitle>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {live
              ? 'Hours, a service, and a public booking page. Share the link above with clients.'
              : 'Minimum to take online bookings: a service, hours, and the booking page switched on. Then copy the link at the top of this page.'}
          </p>
        </div>
        {eligible && (
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={start} disabled={isActive}>
            <Compass className="h-4 w-4" />
            Show me around
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-stone-50 dark:hover:bg-stone-800/60',
                  item.done ? 'text-stone-500 dark:text-stone-400' : 'text-stone-900 dark:text-stone-100',
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-stone-300 dark:text-stone-600" />
                )}
                <span className={item.done ? 'line-through decoration-stone-300' : undefined}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
