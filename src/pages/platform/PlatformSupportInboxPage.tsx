import { useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ownerApi } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge';
import { INBOX_TYPE_TABS } from '@/components/support/ticket-types';
import type { SupportTicketStatus, SupportTicketType } from '@/types/api';

const STATUS_FILTERS: Array<{ value: SupportTicketStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function PlatformSupportInboxPage() {
  const [type, setType] = useState<SupportTicketType>('support');
  const [status, setStatus] = useState<SupportTicketStatus | 'all'>('open');

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets', 'inbox', type, status],
    queryFn: () =>
      ownerApi.listSupportTickets({
        type,
        ...(status === 'all' ? {} : { status }),
      }),
  });

  const tickets = data?.tickets ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Inbox"
        description="Support tickets, feature requests, and bug reports from org owners, staff, and platform users."
      />

      <Tabs value={type} onValueChange={(v) => setType(v as SupportTicketType)}>
        <TabsList>
          {INBOX_TYPE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={(v) => setStatus(v as SupportTicketStatus | 'all')}>
          <SelectTrigger className="w-48">
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
      </div>

      {isLoading ? (
        <LoadingState />
      ) : tickets.length === 0 ? (
        <EmptyState icon={Inbox} title="No tickets" description="Nothing matches this filter right now." />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">
                    <Link to={`/platform/support/${ticket.id}`} className="block hover:underline">
                      {ticket.subject}
                    </Link>
                  </TableCell>
                  <TableCell className="text-stone-500">
                    <div>{ticket.creatorEmail}</div>
                    <div className="text-xs capitalize text-stone-400">{ticket.creatorRole.replace('_', ' ')}</div>
                  </TableCell>
                  <TableCell>
                    <TicketStatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="text-stone-500">{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}
    </div>
  );
}
