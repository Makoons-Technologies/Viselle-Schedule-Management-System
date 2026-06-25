import { useQuery } from '@tanstack/react-query';
import { Plus, Scissors } from 'lucide-react';
import { useState } from 'react';
import { orgApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import { CreateServiceDialog } from '@/components/services/CreateServiceDialog';
import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ServicesPage() {
  const orgId = useOrgId();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['services', orgId],
    queryFn: () => orgApi.listServices(orgId),
    enabled: !!orgId,
  });

  if (isLoading) return <LoadingState />;

  const services = data?.services ?? [];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add Service
        </Button>
      </div>
      {services.length === 0 ? (
        <EmptyState icon={Scissors} title="No services" action={<Button onClick={() => setCreateOpen(true)}>Add Service</Button>} />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.durationMinutes} min</TableCell>
                  <TableCell>{s.priceCents != null ? formatCurrency(s.priceCents) : '—'}</TableCell>
                  <TableCell><Badge variant={s.isActive ? 'success' : 'secondary'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}
      <CreateServiceDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
