import { useQuery } from '@tanstack/react-query';
import { LifeBuoy, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supportApi } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge';
import { NewTicketDialog } from '@/components/support/NewTicketDialog';

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
    question: 'A client double-booked or a slot looks wrong — what do I do?',
    answer:
      'Check Availability for the staff member involved, and confirm the appointment\'s timezone. If it still looks wrong, submit a ticket below with the appointment details.',
  },
  {
    question: "I can't find an answer here — what should I do?",
    answer: 'Submit a ticket below. We reply by email and you can also track replies on this page.',
  },
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

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets', 'mine'],
    queryFn: () => supportApi.listMyTickets(),
  });

  const tickets = data?.tickets ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Help & support"
        description="Get answers or submit a ticket — we'll follow up here and by email."
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
            description="Submit a ticket if you run into an issue or have a question."
            action={<Button onClick={() => setCreateOpen(true)}>Submit a ticket</Button>}
          />
        ) : (
          <Panel>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link to={`/support/${ticket.id}`} className="block hover:underline">
                        {ticket.subject}
                      </Link>
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
      </div>

      <NewTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
