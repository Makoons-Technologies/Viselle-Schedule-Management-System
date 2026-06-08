import { useQuery } from '@tanstack/react-query';
import { Repeat } from 'lucide-react';
import { orgApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function RecurringPage() {
  const orgId = useOrgId();

  const { data, isLoading } = useQuery({
    queryKey: ['recurring', orgId],
    queryFn: () => orgApi.listRecurring(orgId),
    enabled: !!orgId,
  });

  if (isLoading) return <LoadingState />;

  const rules = data?.recurringAppointmentRules ?? [];

  return (
    <div>
      <PageHeader title="Recurring Appointments" description="Manage recurring appointment rules" />
      {rules.length === 0 ? (
        <EmptyState icon={Repeat} title="No recurring rules" description="Recurring rules are created via the API." />
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Frequency</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="capitalize">{r.frequency} (every {r.interval})</TableCell>
                  <TableCell>{formatDate(r.startDate)}</TableCell>
                  <TableCell>{r.startTime}</TableCell>
                  <TableCell><Badge variant={r.status === 'active' ? 'success' : 'secondary'}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
