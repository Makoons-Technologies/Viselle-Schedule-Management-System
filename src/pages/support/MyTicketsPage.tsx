import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LifeBuoy, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supportApi } from '@/lib/api';
import { ListToolbar, matchesSearch } from '@/components/common/ListToolbar';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge';
import { TicketTypeBadge } from '@/components/support/TicketTypeBadge';
import { NewTicketDialog } from '@/components/support/NewTicketDialog';
import {
  SUPPORT_TICKET_STATUS_LABELS,
  SUPPORT_TICKET_STATUSES,
  SUPPORT_TICKET_TYPE_LABELS,
} from '@/components/support/ticket-types';
import type { SupportTicketStatus, SupportTicketType } from '@/types/api';

const FAQ_ITEMS = [
  {
    question: 'How do I add a staff member?',
    answer: 'Go to Settings → Staff and click "Add staff". They\'ll get an email to set a password.',
  },
  {
    question: 'How do I turn on my booking page?',
    answer:
      'Go to Settings → Org settings and enable public booking, then visit Settings → Booking website to customize it.',
  },
  {
    question: 'What is the "Go live" box on my dashboard?',
    answer:
      'While you are setting up, the dashboard shows a Go live checklist: add at least one service, set your hours, and turn on your booking page. When all three are done, the box disappears — you are live and can share the booking link at the top of the dashboard. You can still manage services, hours, and your booking page from Settings anytime.',
  },
  {
    question: 'A client double-booked or a slot looks wrong — what do I do?',
    answer:
      'Check Availability for the staff member involved, and confirm the appointment\'s timezone. If it still looks wrong, submit a ticket below with the appointment details.',
  },
  {
    question: "I can't find an answer here — what should I do?",
    answer: 'Submit a ticket below. We reply by email and you can also track replies on this page.',
  },
];

const TYPE_FILTERS: Array<{ value: SupportTicketType | 'all'; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'support', label: SUPPORT_TICKET_TYPE_LABELS.support },
  { value: 'feature_request', label: SUPPORT_TICKET_TYPE_LABELS.feature_request },
  { value: 'bug', label: SUPPORT_TICKET_TYPE_LABELS.bug },
];

const STATUS_FILTERS: Array<{ value: SupportTicketStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  ...SUPPORT_TICKET_STATUSES.map((status) => ({
    value: status,
    label: SUPPORT_TICKET_STATUS_LABELS[status],
  })),
];

function FaqSection() {
  return (
    <Panel className="p-4 sm:p-6">
      <h2 className="mb-3 text-sm font-medium text-stone-900 dark:text-stone-100">Frequently asked questions</h2>
      <div className="divide-y divide-stone-200 dark:divide-stone-800">
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} className="group py-3 first:pt-0 last:pb-0">
            <summary className="cursor-pointer list-none text-sm font-medium text-stone-800 marker:content-none dark:text-stone-100">
              {item.question}
            </summary>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{item.answer}</p>
          </details>
        ))}
      </div>
    </Panel>
  );
}

export function MyTicketsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<SupportTicketType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets', 'mine', typeFilter],
    queryFn: () => supportApi.listMyTickets(typeFilter === 'all' ? undefined : { type: typeFilter }),
  });

  const tickets = data?.tickets ?? [];
  const filtered = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
        return matchesSearch(search, ticket.subject, ticket.body, ticket.type, ticket.status);
      }),
    [tickets, search, statusFilter],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Help & support"
        description="Get answers or submit a support ticket, feature request, or bug report."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Submit a ticket
          </Button>
        }
      />

      <FaqSection />

      <div>
        <h2 className="mb-3 text-sm font-medium text-stone-900 dark:text-stone-100">My tickets</h2>
        {isLoading ? (
          <LoadingState />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No tickets yet"
            description="Submit a ticket if you run into an issue, have a feature idea, or find a bug."
            action={<Button onClick={() => setCreateOpen(true)}>Submit a ticket</Button>}
          />
        ) : (
          <>
            <ListToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search tickets…"
              filters={
                <>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as SupportTicketType | 'all')}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_FILTERS.map((filter) => (
                        <SelectItem key={filter.value} value={filter.value}>
                          {filter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as SupportTicketStatus | 'all')}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FILTERS.map((filter) => (
                        <SelectItem key={filter.value} value={filter.value}>
                          {filter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              }
            />
            {filtered.length === 0 ? (
              <EmptyState icon={LifeBuoy} title="No tickets match" description="Try a different search or filter." />
            ) : (
              <Panel>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((ticket) => (
                      <TableRow key={ticket.id} className="cursor-pointer">
                        <TableCell className="font-medium">
                          <Link to={`/support/${ticket.id}`} className="block hover:underline">
                            {ticket.subject}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <TicketTypeBadge type={ticket.type} />
                        </TableCell>
                        <TableCell>
                          <TicketStatusBadge status={ticket.status} />
                        </TableCell>
                        <TableCell className="text-stone-500">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Panel>
            )}
          </>
        )}
      </div>

      <NewTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
