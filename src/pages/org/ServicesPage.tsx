import { useQuery } from '@tanstack/react-query';
import { Plus, Scissors, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { orgApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import type { Service } from '@/types/api';
import { CreateServiceDialog } from '@/components/services/CreateServiceDialog';
import { ListToolbar, matchesSearch } from '@/components/common/ListToolbar';
import { Panel } from '@/components/common/Panel';
import { TableIconButton } from '@/components/common/TableIconButton';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type StatusFilter = 'all' | 'active' | 'inactive';

export function ServicesPage() {
  const orgId = useOrgId();
  const trialExpired = useOrgWriteLocked();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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

  const services = data?.services ?? [];
  const filtered = useMemo(
    () =>
      services.filter((s) => {
        if (statusFilter === 'active' && !s.isActive) return false;
        if (statusFilter === 'inactive' && s.isActive) return false;
        return matchesSearch(search, s.name, s.description);
      }),
    [services, search, statusFilter],
  );

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <TrialLockedControl locked={trialExpired}>
          <Button onClick={openCreate} disabled={trialExpired}>
            <Plus className="h-4 w-4" /> Add Service
          </Button>
        </TrialLockedControl>
      </div>
      {services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="No services"
          action={
            <TrialLockedControl locked={trialExpired}>
              <Button onClick={openCreate} disabled={trialExpired}>Add Service</Button>
            </TrialLockedControl>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search services…"
            filters={
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          {filtered.length === 0 ? (
            <EmptyState icon={Scissors} title="No services match" description="Try a different search or filter." />
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
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.durationMinutes} min</TableCell>
                      <TableCell>{s.priceCents != null ? formatCurrency(s.priceCents) : '—'}</TableCell>
                      <TableCell><Badge variant={s.isActive ? 'success' : 'secondary'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>
                        <TrialLockedControl locked={trialExpired}>
                          <TableIconButton
                            icon={Wrench}
                            label="Edit service"
                            onClick={() => openEdit(s)}
                            disabled={trialExpired}
                          />
                        </TrialLockedControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          )}
        </>
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
