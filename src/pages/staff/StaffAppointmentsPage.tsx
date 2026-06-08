import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Search } from 'lucide-react';
import { orgApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { AppointmentDetailSheet } from '@/components/appointments/AppointmentDetailSheet';
import { PageHeader } from '@/components/common/PageHeader';
import { AppointmentStatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Appointment, Customer, Service } from '@/types/api';

type StaffAppointmentView = 'default' | 'all';

function filterStaffAppointments(
  appointments: Appointment[],
  view: StaffAppointmentView,
  search: string,
  lookups: {
    customers: Record<string, Customer>;
    services: Record<string, Service>;
  },
): Appointment[] {
  let list = appointments;
  const now = new Date();

  if (view === 'default') {
    list = list.filter(
      (appt) => appt.status !== 'cancelled' && new Date(appt.startTime) >= now,
    );
  }

  const query = search.trim().toLowerCase();
  if (!query) return list;

  return list.filter((appt) => {
    const customer = lookups.customers[appt.customerId];
    const service = lookups.services[appt.serviceId];
    const haystack = [
      customer ? `${customer.firstName} ${customer.lastName}` : '',
      customer?.email ?? '',
      service?.name ?? '',
      appt.status,
      appt.appointmentNotes ?? '',
      formatDateTime(appt.startTime),
      formatDateTime(appt.endTime),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function StaffAppointmentsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? '';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<StaffAppointmentView>('default');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', orgId, user?.accountId],
    queryFn: () => orgApi.listAppointments(orgId, { accountId: user!.accountId! }),
    enabled: !!orgId && !!user?.accountId,
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
      services: Object.fromEntries((servicesData?.services ?? []).map((s) => [s.id, s])),
      customers: Object.fromEntries((customersData?.customers ?? []).map((c) => [c.id, c])),
    }),
    [servicesData, customersData],
  );

  const appointments = data?.appointments ?? [];
  const filteredAppointments = useMemo(
    () => filterStaffAppointments(appointments, view, search, lookups),
    [appointments, view, search, lookups],
  );

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="My Appointments" description="Appointments assigned to you" />

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as StaffAppointmentView)}>
          <TabsList>
            <TabsTrigger value="default">Default</TabsTrigger>
            <TabsTrigger value="all">All Appointments</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            className="pl-9"
            placeholder="Search customer, service…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={view === 'default' ? 'No upcoming appointments' : 'No appointments found'}
          description={
            search
              ? 'No appointments match your search.'
              : view === 'default'
                ? 'You have no upcoming appointments scheduled.'
                : 'You have no appointments yet.'
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
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.map((appt) => {
                const customer = lookups.customers[appt.customerId];
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
    </div>
  );
}
