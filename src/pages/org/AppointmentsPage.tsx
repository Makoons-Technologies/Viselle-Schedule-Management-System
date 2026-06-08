import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Plus, Search } from 'lucide-react';
import { orgApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import type { Appointment, Account, Customer, Service } from '@/types/api';
import { AppointmentDetailSheet } from '@/components/appointments/AppointmentDetailSheet';
import { CreateAppointmentDialog } from '@/components/appointments/CreateAppointmentDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { AppointmentStatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type AppointmentView = 'default' | 'mine' | 'all';

function buildLookup<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function filterAppointments(
  appointments: Appointment[],
  view: AppointmentView,
  search: string,
  accountId: string | null | undefined,
  lookups: {
    accounts: Record<string, Account>;
    customers: Record<string, Customer>;
    services: Record<string, Service>;
  },
): Appointment[] {
  let list = appointments;
  const now = new Date();

  if (view === 'mine') {
    if (!accountId) return [];
    list = list.filter((appt) => appt.accountId === accountId);
  } else if (view === 'default') {
    list = list.filter(
      (appt) => appt.status !== 'cancelled' && new Date(appt.startTime) >= now,
    );
  }

  const query = search.trim().toLowerCase();
  if (!query) return list;

  return list.filter((appt) => {
    const customer = lookups.customers[appt.customerId];
    const account = lookups.accounts[appt.accountId];
    const service = lookups.services[appt.serviceId];
    const haystack = [
      customer ? `${customer.firstName} ${customer.lastName}` : '',
      customer?.email ?? '',
      customer?.phone ?? '',
      account ? `${account.firstName} ${account.lastName}` : '',
      account?.email ?? '',
      service?.name ?? '',
      appt.status,
      appt.timezone,
      appt.appointmentNotes ?? '',
      formatDateTime(appt.startTime),
      formatDateTime(appt.endTime),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function AppointmentsPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<AppointmentView>('default');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', orgId],
    queryFn: () => orgApi.listAppointments(orgId),
    enabled: !!orgId,
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services', orgId],
    queryFn: () => orgApi.listServices(orgId),
    enabled: !!orgId,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId,
  });

  const lookups = useMemo(
    () => ({
      accounts: buildLookup(accountsData?.accounts ?? []),
      services: buildLookup(servicesData?.services ?? []),
      customers: buildLookup(customersData?.customers ?? []),
    }),
    [accountsData, servicesData, customersData],
  );

  const appointments = data?.appointments ?? [];
  const filteredAppointments = useMemo(
    () => filterAppointments(appointments, view, search, user?.accountId, lookups),
    [appointments, view, search, user?.accountId, lookups],
  );

  const canViewMine = !!user?.accountId;

  if (isLoading) return <LoadingState />;

  const emptyMessages: Record<AppointmentView, { title: string; description: string }> = {
    default: {
      title: 'No upcoming appointments',
      description: search
        ? 'No upcoming appointments match your search.'
        : 'There are no scheduled appointments coming up.',
    },
    mine: {
      title: canViewMine ? 'No appointments assigned to you' : 'No staff account linked',
      description: canViewMine
        ? search
          ? 'None of your appointments match your search.'
          : 'You have no appointments in this view.'
        : 'Your user account is not linked to a staff profile.',
    },
    all: {
      title: 'No appointments found',
      description: search
        ? 'No appointments match your search.'
        : 'Create your first appointment to get started.',
    },
  };

  const empty = emptyMessages[view];

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Manage organization appointments"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as AppointmentView)}>
          <TabsList>
            <TabsTrigger value="default">Default</TabsTrigger>
            <TabsTrigger value="mine" disabled={!canViewMine}>
              My Appointments
            </TabsTrigger>
            <TabsTrigger value="all">All Appointments</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            className="pl-9"
            placeholder="Search customer, staff, service…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={empty.title}
          description={empty.description}
          action={
            view === 'all' && !search ? (
              <Button onClick={() => setCreateOpen(true)}>Create Appointment</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.map((appt) => {
                const customer = lookups.customers[appt.customerId];
                const account = lookups.accounts[appt.accountId];
                const service = lookups.services[appt.serviceId];

                return (
                  <TableRow
                    key={appt.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(appt.id)}
                  >
                    <TableCell>{formatDateTime(appt.startTime)}</TableCell>
                    <TableCell>{formatDateTime(appt.endTime)}</TableCell>
                    <TableCell>
                      {customer ? `${customer.firstName} ${customer.lastName}` : '—'}
                    </TableCell>
                    <TableCell>
                      {account ? `${account.firstName} ${account.lastName}` : '—'}
                    </TableCell>
                    <TableCell>{service?.name ?? '—'}</TableCell>
                    <TableCell>
                      <AppointmentStatusBadge status={appt.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AppointmentDetailSheet appointmentId={selectedId} orgId={orgId} onClose={() => setSelectedId(null)} />
      <CreateAppointmentDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
