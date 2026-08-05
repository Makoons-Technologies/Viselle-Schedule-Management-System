import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ownerApi } from '@/lib/api';
import { ListToolbar, matchesSearch } from '@/components/common/ListToolbar';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomWebsiteStatusBadge } from '@/components/customWebsites/CustomWebsiteStatusBadge';
import type { CustomWebsiteRequestStatus } from '@/types/api';

const STATUS_FILTERS: Array<{ value: CustomWebsiteRequestStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'closed', label: 'Closed' },
];

export function PlatformCustomWebsitesPage() {
  const [status, setStatus] = useState<CustomWebsiteRequestStatus | 'all'>('open');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['custom-website-requests', 'inbox', status],
    queryFn: () => ownerApi.listCustomWebsiteRequests(status === 'all' ? undefined : { status }),
  });

  const requests = data?.requests ?? [];
  const filtered = useMemo(
    () =>
      requests.filter((request) =>
        matchesSearch(
          search,
          request.businessName,
          request.contactName,
          request.contactEmail,
        ),
      ),
    [requests, search],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Custom websites"
        description="Build requests from Get Started when someone selects the custom website option."
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search business, contact…"
        filters={
          <Select value={status} onValueChange={(v) => setStatus(v as CustomWebsiteRequestStatus | 'all')}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No requests"
          description={
            requests.length === 0
              ? 'Nothing matches this filter right now.'
              : 'Try a different search.'
          }
        />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    <Link to={`/platform/custom-websites/${request.id}`} className="block hover:underline">
                      {request.businessName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-stone-500">
                    <div>{request.contactName}</div>
                    <div className="text-xs text-stone-400">{request.contactEmail}</div>
                  </TableCell>
                  <TableCell>
                    <CustomWebsiteStatusBadge status={request.status} />
                  </TableCell>
                  <TableCell className="text-stone-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}
    </div>
  );
}
