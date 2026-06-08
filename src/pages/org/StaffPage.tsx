import { useQuery } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { orgApi } from '@/lib/api';
import { useOrgId } from '@/hooks/useOrgId';
import { CreateStaffDialog } from '@/components/staff/CreateStaffDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function StaffPage() {
  const orgId = useOrgId();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId,
  });

  if (isLoading) return <LoadingState />;

  const accounts = data?.accounts ?? [];

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Manage team members and their roles"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add Staff</Button>}
      />
      {accounts.length === 0 ? (
        <EmptyState icon={Users} title="No staff members" action={<Button onClick={() => setCreateOpen(true)}>Add Staff</Button>} />
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bookable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.firstName} {a.lastName}</TableCell>
                  <TableCell className="text-stone-500">{a.email}</TableCell>
                  <TableCell className="capitalize">{a.role.replace('_', ' ')}</TableCell>
                  <TableCell><Badge variant={a.status === 'active' ? 'success' : 'secondary'}>{a.status}</Badge></TableCell>
                  <TableCell>{a.isBookable ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <CreateStaffDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
