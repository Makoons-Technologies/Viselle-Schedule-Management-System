import { useQuery } from '@tanstack/react-query';
import { Plus, Scissors, Wrench } from 'lucide-react';
import { useState } from 'react';
import { orgApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import type { Service } from '@/types/api';
import { CreateServiceDialog } from '@/components/services/CreateServiceDialog';
import { Panel } from '@/components/common/Panel';
import { TableIconButton } from '@/components/common/TableIconButton';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ServicesPage() {
  const orgId = useOrgId();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const openCreate = () => {
    setEditingService(null);
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setDialogOpen(true);
  };

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
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Service
        </Button>
      </div>
      {services.length === 0 ? (
        <EmptyState icon={Scissors} title="No services" action={<Button onClick={openCreate}>Add Service</Button>} />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[52px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.durationMinutes} min</TableCell>
                  <TableCell>{s.priceCents != null ? formatCurrency(s.priceCents) : '—'}</TableCell>
                  <TableCell><Badge variant={s.isActive ? 'success' : 'secondary'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <TableIconButton icon={Wrench} label="Edit service" onClick={() => openEdit(s)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}
      <CreateServiceDialog
        orgId={orgId}
        service={editingService}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingService(null);
        }}
      />
    </div>
  );
}
