import { useQuery } from '@tanstack/react-query';
import { orgApi } from '@/lib/api';
import { DAY_NAMES } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function StaffAvailabilityPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? '';
  const accountId = user?.accountId ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['availability-rules', orgId, accountId],
    queryFn: () => orgApi.listAvailabilityRules(orgId, accountId),
    enabled: !!orgId && !!accountId,
  });

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="My Availability" description="Your weekly availability schedule" />
      <div className="rounded-xl border border-stone-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.availabilityRules ?? []).map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{DAY_NAMES[rule.dayOfWeek]}</TableCell>
                <TableCell>{rule.startTime}</TableCell>
                <TableCell>{rule.endTime}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
