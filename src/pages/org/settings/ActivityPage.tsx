import { useInfiniteQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Panel, sectionMutedClass } from '@/components/common/Panel';
import { Button } from '@/components/ui/button';
import { useOrgId } from '@/hooks/useOrgId';
import { orgApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { OrgActivityEvent } from '@/types/api';

export function ActivityPage() {
  const orgId = useOrgId();
  const query = useInfiniteQuery({
    queryKey: ['org-activity', orgId],
    queryFn: ({ pageParam }) => orgApi.listOrgActivity(orgId, { limit: 50, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      const events = lastPage.events;
      if (events.length < 50) return undefined;
      return events[events.length - 1]?.createdAt;
    },
    enabled: !!orgId,
  });

  const events = query.data?.pages.flatMap((page) => page.events) ?? [];

  if (query.isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <p className={sectionMutedClass}>
        Everything that happens in this salon — bookings, checkouts, memberships, staff changes, and settings edits.
        Only the owner can see this list.
      </p>
      {events.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No activity yet"
          description="As the team books, checks out, and changes settings, those actions will show up here."
        />
      ) : (
        <Panel className="divide-y divide-stone-100 dark:divide-stone-800">
          {events.map((event) => (
            <ActivityRow key={event.id} event={event} />
          ))}
        </Panel>
      )}
      {query.hasNextPage ? (
        <Button type="button" variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
          {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  );
}

function ActivityRow({ event }: { event: OrgActivityEvent }) {
  const who = event.actorEmail || event.actorRole || 'System';
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-stone-900 dark:text-stone-100">{event.action}</p>
        <p className="text-xs text-stone-400">{formatDateTime(event.createdAt)}</p>
      </div>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {who}
        {event.statusCode && event.statusCode >= 400 ? ` · ${event.statusCode}` : ''}
      </p>
    </div>
  );
}
