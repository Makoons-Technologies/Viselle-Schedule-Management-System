import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UserCircle } from 'lucide-react';
import { orgApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import { ListToolbar, matchesSearch } from '@/components/common/ListToolbar';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function CustomersPage() {
  const orgId = useOrgId();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId,
  });

  const customers = data?.customers ?? [];
  const filtered = useMemo(
    () =>
      customers.filter((c) =>
        matchesSearch(search, c.firstName, c.lastName, c.email, c.phone),
      ),
    [customers, search],
  );

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Open a customer to edit contact details and read notes by service"
      />
      {customers.length === 0 ? (
        <EmptyState icon={UserCircle} title="No customers yet" description="Customers are created when appointments are booked." />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, email, phone…"
          />
          {filtered.length === 0 ? (
            <EmptyState
              icon={UserCircle}
              title="No customers match"
              description="Try a different search."
            />
          ) : (
            <Panel>
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
                  {filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/orgs/${orgId}/customers/${c.id}`)}
                    >
                      <TableCell className="font-medium">
                        <Link
                          to={`/orgs/${orgId}/customers/${c.id}`}
                          className="text-brand-700 hover:underline dark:text-brand-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.firstName} {c.lastName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-stone-500">{c.email ?? '—'}</TableCell>
                      <TableCell className="text-stone-500">{c.phone ?? '—'}</TableCell>
                      <TableCell className="text-stone-500">{formatDate(c.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
