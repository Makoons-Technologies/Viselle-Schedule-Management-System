import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { UserCircle } from 'lucide-react';
import { orgApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useOrgId } from '@/hooks/useOrgId';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CustomerServiceNote } from '@/types/api';

function groupNotesByService(notes: CustomerServiceNote[]) {
  const groups = new Map<string, { serviceId: string; serviceName: string; notes: CustomerServiceNote[] }>();
  for (const note of notes) {
    const existing = groups.get(note.serviceId);
    if (existing) {
      existing.notes.push(note);
      continue;
    }
    groups.set(note.serviceId, {
      serviceId: note.serviceId,
      serviceName: note.serviceName?.trim() || 'Service',
      notes: [note],
    });
  }
  return [...groups.values()];
}

export function CustomerDetailPage() {
  const orgId = useOrgId();
  const { customerId } = useParams<{ customerId: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer', orgId, customerId],
    queryFn: () => orgApi.getCustomer(orgId, customerId!),
    enabled: !!orgId && !!customerId,
  });

  const { data: notesData } = useQuery({
    queryKey: ['customer-service-notes', orgId, customerId, 'all'],
    queryFn: () => orgApi.listCustomerServiceNotes(orgId, customerId!),
    enabled: !!orgId && !!customerId,
  });

  const customer = data?.customer;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!customer) return;
    setFirstName(customer.firstName);
    setLastName(customer.lastName);
    setEmail(customer.email ?? '');
    setPhone(customer.phone ?? '');
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: () =>
      orgApi.updateCustomer(orgId, customerId!, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() === '' ? null : email.trim(),
        phone: phone.trim() === '' ? null : phone.trim(),
      }),
    onSuccess: (result) => {
      toast.success('Customer updated');
      queryClient.setQueryData(['customer', orgId, customerId], result);
      queryClient.invalidateQueries({ queryKey: ['customers', orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const noteGroups = useMemo(() => groupNotesByService(notesData?.notes ?? []), [notesData?.notes]);

  if (!orgId || !customerId) return <Navigate to="/" replace />;
  if (isLoading) return <LoadingState />;
  if (isError || !customer) {
    return (
      <div>
        <SettingsBackHeader title="Customer" backTo={`/orgs/${orgId}/customers`} />
        <EmptyState
          icon={UserCircle}
          title="Customer not found"
          description="They may have been removed, or the link is outdated."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <SettingsBackHeader title={`${customer.firstName} ${customer.lastName}`} backTo={`/orgs/${orgId}/customers`} />

      <Panel className="p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Contact</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Fix a name, email, or phone if it was booked wrong. This does not change past appointments.
        </p>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!firstName.trim() || !lastName.trim()) {
              toast.error('First and last name are required');
              return;
            }
            updateMutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="customer-first-name">First name</Label>
            <Input
              id="customer-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-last-name">Last name</Label>
            <Input id="customer-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-email">Email</Label>
            <Input
              id="customer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-phone">Phone</Label>
            <Input id="customer-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save contact'}
            </Button>
          </div>
        </form>
      </Panel>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Notes by service</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Everything written on appointments, grouped by the service it was for.
        </p>
        {noteGroups.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">No notes yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {noteGroups.map((group) => (
              <Panel key={group.serviceId} className="p-4">
                <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">{group.serviceName}</h3>
                <ul className="mt-3 space-y-3">
                  {group.notes.map((note) => (
                    <li key={note.id} className="border-t border-stone-100 pt-3 first:border-t-0 first:pt-0 dark:border-stone-800">
                      <p className="whitespace-pre-wrap text-sm text-stone-800 dark:text-stone-200">{note.body}</p>
                      <p className="mt-1 text-xs text-stone-400">{formatDateTime(note.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-stone-400">
          Add new notes from an appointment —{' '}
          <Link to={`/orgs/${orgId}/appointments`} className="text-brand-700 hover:underline dark:text-brand-300">
            open Appointments
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
