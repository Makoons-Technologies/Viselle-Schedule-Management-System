import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { TableRowActions } from '@/components/common/TableIconButton';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { customerDisplayName } from '@/lib/customers';
import { cn, formatDate } from '@/lib/utils';
import type { Account, WaitlistEntry, WaitlistStatus } from '@/types/api';

const ANY = '__any__';

type StatusFilter = 'waiting' | 'offered' | 'booked' | 'all';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'offered', label: 'Offered' },
  { value: 'booked', label: 'Booked' },
  { value: 'all', label: 'All' },
];

const STATUS_LABEL: Record<WaitlistStatus, string> = {
  waiting: 'Waiting',
  offered: 'Offered',
  booked: 'Booked',
  cancelled: 'Removed',
};

const EMPTY_FORM = {
  customerId: '',
  serviceId: ANY,
  accountId: ANY,
  preferredDate: '',
  notes: '',
};

function statusBadgeVariant(status: WaitlistStatus): 'default' | 'warning' | 'success' | 'secondary' {
  switch (status) {
    case 'waiting':
      return 'default';
    case 'offered':
      return 'warning';
    case 'booked':
      return 'success';
    case 'cancelled':
      return 'secondary';
  }
}

function staffLabel(account: Pick<Account, 'firstName' | 'lastName'> | undefined, fallback: string) {
  if (!account) return fallback;
  return `${account.firstName} ${account.lastName}`.trim() || fallback;
}

function customerName(customers: { id: string; firstName: string; lastName: string }[], customerId: string) {
  const customer = customers.find((item) => item.id === customerId);
  return customer ? customerDisplayName(customer) : 'Unknown person';
}

function serviceName(services: { id: string; name: string }[], serviceId?: string | null) {
  if (!serviceId) return 'Any service';
  return services.find((item) => item.id === serviceId)?.name ?? 'Unknown service';
}

function staffName(accounts: Account[], accountId?: string | null) {
  if (!accountId) return 'Any staff';
  return staffLabel(
    accounts.find((item) => item.id === accountId),
    'Unknown staff',
  );
}

function preferredDateLabel(preferredDate?: string | null) {
  if (!preferredDate) return 'Any day';
  return formatDate(preferredDate);
}

function emptyCopy(filter: StatusFilter) {
  switch (filter) {
    case 'offered':
      return {
        title: 'Nobody has been offered a time yet',
        description: 'When a spot opens, offer it to the next person waiting — then mark them offered here.',
      };
    case 'booked':
      return {
        title: 'Nobody from the waitlist is booked yet',
        description: 'After they take the opening, mark them booked so you know who filled the gap.',
      };
    case 'all':
      return {
        title: 'The waitlist is empty',
        description: 'Add someone who wants the next opening. When a time frees up, call or tell them in person.',
      };
    default:
      return {
        title: 'Nobody is waiting right now',
        description:
          'Add people who want the next opening. If someone cancels, offer that time to the next person here.',
      };
  }
}

function WaitlistActions({
  entry,
  trialLocked,
  busy,
  onOffered,
  onBooked,
  onRemove,
}: {
  entry: WaitlistEntry;
  trialLocked: boolean;
  busy: boolean;
  onOffered: (entry: WaitlistEntry) => void;
  onBooked: (entry: WaitlistEntry) => void;
  onRemove: (entry: WaitlistEntry) => void;
}) {
  const showOffered = entry.status === 'waiting';
  const showBooked = entry.status === 'waiting' || entry.status === 'offered';
  const showRemove = entry.status !== 'cancelled';
  if (!showOffered && !showBooked && !showRemove) return null;

  return (
    <TableRowActions className="flex-wrap justify-start desktop-shell:justify-end">
      {showOffered ? (
        <TrialLockedControl locked={trialLocked}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={trialLocked || busy}
            onClick={() => onOffered(entry)}
          >
            Mark offered
          </Button>
        </TrialLockedControl>
      ) : null}
      {showBooked ? (
        <TrialLockedControl locked={trialLocked}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={trialLocked || busy}
            onClick={() => onBooked(entry)}
          >
            Mark booked
          </Button>
        </TrialLockedControl>
      ) : null}
      {showRemove ? (
        <TrialLockedControl locked={trialLocked}>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            disabled={trialLocked || busy}
            onClick={() => onRemove(entry)}
          >
            Remove
          </Button>
        </TrialLockedControl>
      ) : null}
    </TableRowActions>
  );
}

function WaitlistCard({
  entry,
  customer,
  service,
  staff,
  preferredDate,
  notes,
  trialLocked,
  busy,
  onOffered,
  onBooked,
  onRemove,
}: {
  entry: WaitlistEntry;
  customer: string;
  service: string;
  staff: string;
  preferredDate: string;
  notes?: string | null;
  trialLocked: boolean;
  busy: boolean;
  onOffered: (entry: WaitlistEntry) => void;
  onBooked: (entry: WaitlistEntry) => void;
  onRemove: (entry: WaitlistEntry) => void;
}) {
  return (
    <div className="space-y-3 border-b border-stone-100 p-4 last:border-b-0 dark:border-stone-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-stone-900 dark:text-stone-100">{customer}</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{service}</p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {staff} · {preferredDate}
          </p>
          {notes ? <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{notes}</p> : null}
        </div>
        <Badge variant={statusBadgeVariant(entry.status)} className="shrink-0">
          {STATUS_LABEL[entry.status]}
        </Badge>
      </div>
      <WaitlistActions
        entry={entry}
        trialLocked={trialLocked}
        busy={busy}
        onOffered={onOffered}
        onBooked={onBooked}
        onRemove={onRemove}
      />
    </div>
  );
}

export function WaitlistPage() {
  const orgId = useOrgId();
  const trialExpired = useOrgWriteLocked();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<StatusFilter>('waiting');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [removing, setRemoving] = useState<WaitlistEntry | null>(null);

  const waitlistQuery = useQuery({
    queryKey: ['waitlist', orgId],
    queryFn: () => orgApi.listWaitlist(orgId),
    enabled: !!orgId,
  });

  const customersQuery = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId,
  });

  const servicesQuery = useQuery({
    queryKey: ['services', orgId],
    queryFn: () => orgApi.listServices(orgId),
    enabled: !!orgId,
  });

  const accountsQuery = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId,
  });

  const customers = customersQuery.data?.customers ?? [];
  const services = servicesQuery.data?.services ?? [];
  const accounts = accountsQuery.data?.accounts ?? [];
  const entries = waitlistQuery.data?.entries ?? [];

  const activeServices = useMemo(
    () => services.filter((service) => service.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    [services],
  );

  const bookableStaff = useMemo(() => {
    const bookable = accounts.filter((account) => account.isBookable && account.status === 'active');
    const list = bookable.length > 0 ? bookable : accounts.filter((account) => account.status === 'active');
    return [...list].sort((a, b) => staffLabel(a, '').localeCompare(staffLabel(b, '')));
  }, [accounts]);

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => customerDisplayName(a).localeCompare(customerDisplayName(b))),
    [customers],
  );

  const filtered = useMemo(() => {
    const visible = entries.filter((entry) => {
      if (filter === 'all') return entry.status !== 'cancelled';
      return entry.status === filter;
    });
    return visible.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [entries, filter]);

  const counts = useMemo(() => {
    const waiting = entries.filter((entry) => entry.status === 'waiting').length;
    const offered = entries.filter((entry) => entry.status === 'offered').length;
    const booked = entries.filter((entry) => entry.status === 'booked').length;
    return { waiting, offered, booked, all: waiting + offered + booked };
  }, [entries]);

  const invalidateWaitlist = () => {
    void queryClient.invalidateQueries({ queryKey: ['waitlist', orgId] });
  };

  const addMutation = useMutation({
    mutationFn: () =>
      orgApi.addWaitlist(orgId, {
        customerId: form.customerId,
        ...(form.serviceId !== ANY ? { serviceId: form.serviceId } : {}),
        ...(form.accountId !== ANY ? { accountId: form.accountId } : {}),
        ...(form.preferredDate ? { preferredDate: form.preferredDate } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      }),
    onSuccess: () => {
      toast.success('Added to the waitlist');
      invalidateWaitlist();
      setForm(EMPTY_FORM);
      setAddOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not add this person. Try again.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ entryId, status }: { entryId: string; status: WaitlistStatus }) =>
      orgApi.updateWaitlist(orgId, entryId, { status }),
    onSuccess: (_data, { status }) => {
      if (status === 'offered') {
        toast.success('Marked as offered. Call or tell them in person — waitlist texts aren’t on yet.');
      } else if (status === 'booked') {
        toast.success('Marked as booked');
      } else if (status === 'cancelled') {
        toast.success('Removed from the waitlist');
      }
      invalidateWaitlist();
      setRemoving(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not update the waitlist. Try again.')),
  });

  const busyEntryId = updateMutation.isPending ? updateMutation.variables?.entryId : undefined;
  const empty = emptyCopy(filter);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setAddOpen(true);
  };

  if (waitlistQuery.isLoading) return <LoadingState message="Loading waitlist..." />;

  return (
    <div>
      <PageHeader
        title="Waitlist"
        description="People waiting for an opening. When someone cancels, offer the time to the next person here. No texts yet — call or tell them in person."
        actions={
          <TrialLockedControl locked={trialExpired}>
            <Button onClick={openAdd} disabled={trialExpired}>
              <Plus className="h-4 w-4" /> Add person
            </Button>
          </TrialLockedControl>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter waitlist">
        {FILTERS.map((item) => {
          const selected = filter === item.value;
          return (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={selected ? 'default' : 'outline'}
              className="rounded-full"
              aria-pressed={selected}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
              <span className={cn('ml-1 tabular-nums', selected ? 'text-white/80' : 'text-stone-500')}>
                {counts[item.value]}
              </span>
            </Button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={empty.title}
          description={empty.description}
          action={
            filter === 'waiting' || filter === 'all' ? (
              <TrialLockedControl locked={trialExpired}>
                <Button onClick={openAdd} disabled={trialExpired}>
                  Add person
                </Button>
              </TrialLockedControl>
            ) : undefined
          }
        />
      ) : (
        <Panel className="overflow-hidden">
          <div className="desktop-shell:hidden">
            {filtered.map((entry) => (
              <WaitlistCard
                key={entry.id}
                entry={entry}
                customer={customerName(customers, entry.customerId)}
                service={serviceName(services, entry.serviceId)}
                staff={staffName(accounts, entry.accountId)}
                preferredDate={preferredDateLabel(entry.preferredDate)}
                notes={entry.notes}
                trialLocked={trialExpired}
                busy={busyEntryId === entry.id}
                onOffered={(item) => updateMutation.mutate({ entryId: item.id, status: 'offered' })}
                onBooked={(item) => updateMutation.mutate({ entryId: item.id, status: 'booked' })}
                onRemove={setRemoving}
              />
            ))}
          </div>
          <div className="hidden desktop-shell:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Preferred staff</TableHead>
                  <TableHead>Preferred date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[1%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <p className="font-medium">{customerName(customers, entry.customerId)}</p>
                      {entry.notes ? (
                        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{entry.notes}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>{serviceName(services, entry.serviceId)}</TableCell>
                    <TableCell>{staffName(accounts, entry.accountId)}</TableCell>
                    <TableCell>{preferredDateLabel(entry.preferredDate)}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(entry.status)}>{STATUS_LABEL[entry.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <WaitlistActions
                        entry={entry}
                        trialLocked={trialExpired}
                        busy={busyEntryId === entry.id}
                        onOffered={(item) => updateMutation.mutate({ entryId: item.id, status: 'offered' })}
                        onBooked={(item) => updateMutation.mutate({ entryId: item.id, status: 'booked' })}
                        onRemove={setRemoving}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setForm(EMPTY_FORM);
            addMutation.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add someone to the waitlist</DialogTitle>
            <DialogDescription>
              We’ll put them in line for the next opening. When a time frees up, call or tell them in person —
              Viselle doesn’t text waitlist people yet.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!form.customerId || addMutation.isPending || trialExpired) return;
              addMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="waitlist-customer">Customer</Label>
              <Select
                value={form.customerId || undefined}
                onValueChange={(customerId) => setForm((current) => ({ ...current, customerId }))}
              >
                <SelectTrigger id="waitlist-customer">
                  <SelectValue placeholder="Choose a customer" />
                </SelectTrigger>
                <SelectContent>
                  {sortedCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customerDisplayName(customer)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sortedCustomers.length === 0 ? (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Add a customer on the Customers page first, then come back here.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="waitlist-service">Service (optional)</Label>
                <Select
                  value={form.serviceId}
                  onValueChange={(serviceId) => setForm((current) => ({ ...current, serviceId }))}
                >
                  <SelectTrigger id="waitlist-service">
                    <SelectValue placeholder="Any service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any service</SelectItem>
                    {activeServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waitlist-staff">Preferred staff (optional)</Label>
                <Select
                  value={form.accountId}
                  onValueChange={(accountId) => setForm((current) => ({ ...current, accountId }))}
                >
                  <SelectTrigger id="waitlist-staff">
                    <SelectValue placeholder="Any staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any staff</SelectItem>
                    {bookableStaff.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {staffLabel(account, 'Staff')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="waitlist-date">Preferred date (optional)</Label>
              <Input
                id="waitlist-date"
                type="date"
                value={form.preferredDate}
                onChange={(event) => setForm((current) => ({ ...current, preferredDate: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="waitlist-notes">Notes (optional)</Label>
              <Textarea
                id="waitlist-notes"
                rows={3}
                placeholder="Anything useful — preferred time of day, who to call, etc."
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!form.customerId || addMutation.isPending || trialExpired}>
                {addMutation.isPending ? 'Adding…' : 'Add to waitlist'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove from the waitlist?"
        description={
          removing
            ? `${customerName(customers, removing.customerId)} won’t show on the waiting list. You can add them again later if they still want an opening.`
            : ''
        }
        confirmLabel="Remove"
        destructive
        loading={updateMutation.isPending}
        onConfirm={() => removing && updateMutation.mutate({ entryId: removing.id, status: 'cancelled' })}
      />
    </div>
  );
}
