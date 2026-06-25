import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Calendar, Search } from 'lucide-react';

import { orgApi } from '@/lib/api';

import { formatDateTime } from '@/lib/utils';

import { useAuth } from '@/context/AuthContext';

import { AppointmentDetailSheet } from '@/components/appointments/AppointmentDetailSheet';

import { HideCancelledToggle } from '@/components/appointments/HideCancelledToggle';

import { ShowAllAppointmentsToggle } from '@/components/appointments/ShowAllAppointmentsToggle';

import { PageHeader } from '@/components/common/PageHeader';

import { AppointmentStatusBadge } from '@/components/common/StatusBadge';

import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';

import { LoadingState } from '@/components/common/LoadingState';

import { Input } from '@/components/ui/input';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useHideCancelledAppointments } from '@/hooks/useHideCancelledAppointments';

import type { Appointment, Customer, Service } from '@/types/api';



function filterStaffAppointments(

  appointments: Appointment[],

  search: string,

  hideCancelled: boolean,

  lookups: {

    customers: Record<string, Customer>;

    services: Record<string, Service>;

  },

): Appointment[] {

  let list = appointments;



  if (hideCancelled) {

    list = list.filter((appt) => appt.visitStatus !== 'cancelled');

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

      appt.visitStatus,
      appt.paymentStatus,

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

  const [selectedAppointment, setSelectedAppointment] = useState<{
    id: string;
    startTime: string;
  } | null>(null);

  const [showAll, setShowAll] = useState(false);

  const [search, setSearch] = useState('');

  const { hideCancelled, setHideCancelled } = useHideCancelledAppointments();



  const { data, isLoading } = useQuery({

    queryKey: ['appointments', orgId, showAll ? 'all' : user?.accountId],

    queryFn: () =>

      showAll

        ? orgApi.listAppointments(orgId)

        : orgApi.listAppointments(orgId, { accountId: user!.accountId! }),

    enabled: !!orgId && (showAll || !!user?.accountId),

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

    () => filterStaffAppointments(appointments, search, hideCancelled, lookups),

    [appointments, search, hideCancelled, lookups],

  );



  if (isLoading) return <LoadingState />;



  return (

    <div>

      <PageHeader title="My Appointments" description="Appointments assigned to you" />



      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

          <ShowAllAppointmentsToggle checked={showAll} onCheckedChange={setShowAll} />

          <HideCancelledToggle checked={hideCancelled} onCheckedChange={setHideCancelled} />

        </div>

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

          title={showAll ? 'No appointments found' : 'No appointments assigned to you'}

          description={

            search

              ? 'No appointments match your search.'

              : showAll

                ? 'There are no appointments in the organization yet.'

                : 'You have no appointments in this view. Turn on “Show all appointments” to see the full list.'

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

                    key={`${appt.id}-${appt.startTime}`}

                    className="cursor-pointer"

                    onClick={() => setSelectedAppointment({ id: appt.id, startTime: appt.startTime })}

                  >

                    <TableCell>{formatDateTime(appt.startTime)}</TableCell>

                    <TableCell>{formatDateTime(appt.endTime)}</TableCell>

                    <TableCell>

                      {customer ? `${customer.firstName} ${customer.lastName}` : '—'}

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

    </div>

  );

}


