import { useQuery } from '@tanstack/react-query';
import { UserCircle } from 'lucide-react';
import { orgApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function CustomersPage() {
  const orgId = useOrgId();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId,
  });

  if (isLoading) return <LoadingState />;

  const customers = data?.customers ?? [];

  return (
    <div>
      <PageHeader title="Customers" description="View all customers who have booked appointments" />
      {customers.length === 0 ? (
        <EmptyState icon={UserCircle} title="No customers yet" description="Customers are created when appointments are booked." />
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.firstName} {c.lastName}</TableCell>
                  <TableCell className="text-stone-500">{c.email ?? '—'}</TableCell>
                  <TableCell className="text-stone-500">{c.phone ?? '—'}</TableCell>
                  <TableCell className="text-stone-500">{formatDate(c.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
