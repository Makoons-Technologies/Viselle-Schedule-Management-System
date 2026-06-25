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

import { HideCancelledToggle } from '@/components/appointments/HideCancelledToggle';

import { ShowAllAppointmentsToggle } from '@/components/appointments/ShowAllAppointmentsToggle';

import { PageHeader } from '@/components/common/PageHeader';

import { AppointmentStatusBadge } from '@/components/common/StatusBadge';

import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';

import { LoadingState } from '@/components/common/LoadingState';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useHideCancelledAppointments } from '@/hooks/useHideCancelledAppointments';

function buildLookup<T extends { id: string }>(items: T[]): Record<string, T> {

  return Object.fromEntries(items.map((item) => [item.id, item]));

}



function filterAppointments(

  appointments: Appointment[],

  showAll: boolean,

  search: string,

  accountId: string | null | undefined,

  hideCancelled: boolean,
  visitFilter: 'all' | 'arrived_today' | 'unpaid' | 'missed',

  lookups: {

    accounts: Record<string, Account>;

    customers: Record<string, Customer>;

    services: Record<string, Service>;

  },

): Appointment[] {

  let list = appointments;



  if (!showAll) {

    if (!accountId) return [];

    list = list.filter((appt) => appt.accountId === accountId);

  }



  if (hideCancelled) {
    list = list.filter((appt) => appt.visitStatus !== 'cancelled');
  }

  const today = new Date().toISOString().slice(0, 10);
  if (visitFilter === 'arrived_today') {
    list = list.filter(
      (appt) => appt.visitStatus === 'arrived' && appt.startTime.slice(0, 10) === today,
    );
  } else if (visitFilter === 'unpaid') {
    list = list.filter((appt) => appt.visitStatus === 'arrived' && appt.paymentStatus === 'unpaid');
  } else if (visitFilter === 'missed') {
    list = list.filter((appt) => appt.visitStatus === 'missed');
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

      appt.visitStatus,
      appt.paymentStatus,

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

  const [selectedAppointment, setSelectedAppointment] = useState<{
    id: string;
    startTime: string;
  } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);

  const [showAll, setShowAll] = useState(false);

  const [search, setSearch] = useState('');

  const { hideCancelled, setHideCancelled } = useHideCancelledAppointments();
  const [visitFilter, setVisitFilter] = useState<'all' | 'arrived_today' | 'unpaid' | 'missed'>('all');



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

    () => filterAppointments(appointments, showAll, search, user?.accountId, hideCancelled, visitFilter, lookups),

    [appointments, showAll, search, user?.accountId, hideCancelled, visitFilter, lookups],

  );



  const canViewMine = !!user?.accountId;



  if (isLoading) return <LoadingState />;



  const empty = showAll

    ? {

        title: 'No appointments found',

        description: search

          ? 'No appointments match your search.'

          : 'Create your first appointment to get started.',

      }

    : {

        title: canViewMine ? 'No appointments assigned to you' : 'No staff account linked',

        description: canViewMine

          ? search

            ? 'None of your appointments match your search.'

            : 'You have no appointments in this view. Turn on “Show all appointments” to see the full list.'

          : 'Your user account is not linked to a staff profile. Turn on “Show all appointments” to see the organization list.',

      };



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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

          <ShowAllAppointmentsToggle checked={showAll} onCheckedChange={setShowAll} />

          <HideCancelledToggle checked={hideCancelled} onCheckedChange={setHideCancelled} />

          <Select value={visitFilter} onValueChange={(v) => setVisitFilter(v as typeof visitFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="arrived_today">Arrived today</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
            </SelectContent>
          </Select>

        </div>

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

            showAll && !search ? (

              <Button onClick={() => setCreateOpen(true)}>Create Appointment</Button>

            ) : undefined

          }

        />

      ) : (

        <Panel>

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

                    key={`${appt.id}-${appt.startTime}`}

                    className="cursor-pointer"

                    onClick={() => setSelectedAppointment({ id: appt.id, startTime: appt.startTime })}

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

                      <AppointmentStatusBadge
                        visitStatus={appt.visitStatus}
                        paymentStatus={appt.paymentStatus}
                        recurringAppointmentRuleId={appt.recurringAppointmentRuleId}
                      />

                    </TableCell>

                  </TableRow>

                );

              })}

            </TableBody>

          </Table>

        </Panel>

      )}



      <AppointmentDetailSheet
        appointmentId={selectedAppointment?.id ?? null}
        occurrenceStartTime={selectedAppointment?.startTime}
        orgId={orgId}
        onClose={() => setSelectedAppointment(null)}
      />

      <CreateAppointmentDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />

    </div>

  );

}


