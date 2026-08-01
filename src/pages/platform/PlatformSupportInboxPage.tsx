import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Copy, Inbox } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge';
import { TicketTypeBadge } from '@/components/support/TicketTypeBadge';
import {
  INBOX_SHOW_LINEAR_STORAGE_KEY,
  SUPPORT_TICKET_STATUS_LABELS,
  SUPPORT_TICKET_STATUSES,
  SUPPORT_TICKET_TYPE_LABELS,
  SUPPORT_TICKET_TYPES,
} from '@/components/support/ticket-types';
import type {
  InboxLinearIssue,
  SupportTicket,
  SupportTicketAgentBrief,
  SupportTicketStatus,
  SupportTicketType,
} from '@/types/api';

const STATUS_FILTERS: Array<{ value: SupportTicketStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  ...SUPPORT_TICKET_STATUSES.map((status) => ({
    value: status,
    label: SUPPORT_TICKET_STATUS_LABELS[status],
  })),
];

const TYPE_FILTERS: Array<{ value: SupportTicketType | 'all' | 'linear'; label: string }> = [
  { value: 'all', label: 'All types' },
  ...SUPPORT_TICKET_TYPES.map((type) => ({
    value: type,
    label: SUPPORT_TICKET_TYPE_LABELS[type],
  })),
  { value: 'linear', label: 'Linear only' },
];

type InboxRow =
  | { kind: 'viselle'; key: string; ticket: SupportTicket }
  | { kind: 'linear'; key: string; issue: InboxLinearIssue };

function readShowLinearPreference(): boolean {
  try {
    return localStorage.getItem(INBOX_SHOW_LINEAR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function mapLinearStateToFilterStatus(stateName: string): SupportTicketStatus | null {
  const n = stateName.toLowerCase();
  if (n === 'todo' || n === 'backlog' || n === 'triage') return 'open';
  if (n === 'in progress') return 'in_progress';
  if (n === 'in review') return 'in_review';
  if (n === 'done') return 'done';
  if (n === 'canceled' || n === 'cancelled' || n === 'duplicate') return 'canceled';
  return null;
}

export function PlatformSupportInboxPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<SupportTicketType | 'all' | 'linear'>('all');
  const [status, setStatus] = useState<SupportTicketStatus | 'all'>('open');
  const [showLinear, setShowLinear] = useState(readShowLinearPreference);
  const [selectedViselle, setSelectedViselle] = useState<string[]>([]);
  const [selectedLinear, setSelectedLinear] = useState<string[]>([]);
  const [brief, setBrief] = useState<SupportTicketAgentBrief | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets', 'inbox', type === 'linear' ? 'all' : type, status],
    queryFn: () =>
      ownerApi.listSupportTickets({
        ...(type === 'all' || type === 'linear' ? {} : { type }),
        ...(status === 'all' ? {} : { status }),
      }),
    enabled: type !== 'linear',
  });

  const linearQuery = useQuery({
    queryKey: ['support-tickets', 'inbox', 'linear-backlog'],
    queryFn: () => ownerApi.listLinearInboxBacklog(),
    enabled: showLinear,
    retry: false,
  });

  const tickets = type === 'linear' ? [] : (data?.tickets ?? []);
  const linearIssues = useMemo(() => {
    if (!showLinear) return [];
    const issues = linearQuery.data?.issues ?? [];
    if (status === 'all') return issues;
    return issues.filter((issue) => mapLinearStateToFilterStatus(issue.stateName) === status);
  }, [showLinear, linearQuery.data?.issues, status]);

  const rows: InboxRow[] = useMemo(() => {
    const viselleRows: InboxRow[] =
      type === 'linear'
        ? []
        : tickets.map((ticket) => ({ kind: 'viselle', key: `v:${ticket.id}`, ticket }));
    const linearRows: InboxRow[] =
      type === 'linear' || type === 'all'
        ? linearIssues.map((issue) => ({ kind: 'linear', key: `l:${issue.id}`, issue }))
        : [];
    return [...viselleRows, ...linearRows];
  }, [tickets, linearIssues, type]);

  const selectedCount = selectedViselle.length + selectedLinear.length;

  const briefMutation = useMutation({
    mutationFn: (payload: { ticketIds: string[]; linearIssueIds: string[] }) =>
      ownerApi.prepareSupportTicketAgentBrief(payload),
    onSuccess: (result) => {
      setBrief(result);
      setSelectedViselle([]);
      setSelectedLinear([]);
      queryClient.invalidateQueries({ queryKey: ['support-tickets', 'inbox'] });
      toast.success(
        result.linearSynced
          ? 'Agent brief ready — marked In Progress and synced where Linear is linked'
          : 'Agent brief ready — Viselle tickets marked In Progress',
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function setShowLinearPreference(on: boolean) {
    setShowLinear(on);
    try {
      localStorage.setItem(INBOX_SHOW_LINEAR_STORAGE_KEY, on ? '1' : '0');
    } catch {
      // ignore
    }
    if (!on) {
      setSelectedLinear([]);
      if (type === 'linear') setType('all');
    }
  }

  function toggleSelectViselle(id: string, on: boolean) {
    setSelectedViselle((prev) =>
      on ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id),
    );
  }

  function toggleSelectLinear(id: string, on: boolean) {
    setSelectedLinear((prev) =>
      on ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id),
    );
  }

  function toggleAllVisible(on: boolean) {
    const viselleIds = rows.filter((r) => r.kind === 'viselle').map((r) => r.ticket.id);
    const linearIds = rows.filter((r) => r.kind === 'linear').map((r) => r.issue.id);
    setSelectedViselle((prev) =>
      on ? Array.from(new Set([...prev, ...viselleIds])) : prev.filter((id) => !viselleIds.includes(id)),
    );
    setSelectedLinear((prev) =>
      on ? Array.from(new Set([...prev, ...linearIds])) : prev.filter((id) => !linearIds.includes(id)),
    );
  }

  function sendToAgent(ticketIds: string[], linearIssueIds: string[]) {
    if (ticketIds.length + linearIssueIds.length === 0) return;
    briefMutation.mutate({ ticketIds, linearIssueIds });
  }

  async function copyPrompt() {
    if (!brief?.prompt) return;
    try {
      await navigator.clipboard.writeText(brief.prompt);
      toast.success('Agent prompt copied');
    } catch {
      toast.error('Could not copy — select the text manually');
    }
  }

  const allVisibleSelected =
    rows.length > 0 &&
    rows.every((row) =>
      row.kind === 'viselle'
        ? selectedViselle.includes(row.ticket.id)
        : selectedLinear.includes(row.issue.id),
    );

  const loading = (type !== 'linear' && isLoading) || (showLinear && linearQuery.isLoading);
  const linearError =
    showLinear && linearQuery.isError
      ? linearQuery.error instanceof Error
        ? linearQuery.error.message
        : 'Could not load Linear project tickets'
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Inbox"
        description="Triage Viselle-reported support, feature requests, and bug reports. Optionally include unlinked Linear project tickets."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={type}
          onValueChange={(v) => setType(v as SupportTicketType | 'all' | 'linear')}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.filter((filter) => filter.value !== 'linear' || showLinear).map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v as SupportTicketStatus | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
          <Switch checked={showLinear} onCheckedChange={setShowLinearPreference} />
          Show all Linear
        </label>

        <Button
          variant="default"
          disabled={selectedCount === 0 || briefMutation.isPending}
          onClick={() => sendToAgent(selectedViselle, selectedLinear)}
        >
          <Bot className="h-4 w-4" />
          {briefMutation.isPending ? 'Preparing…' : `Send to Cursor agent (${selectedCount})`}
        </Button>
      </div>

      {showLinear && !linearQuery.isLoading ? (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {linearQuery.data?.linearSyncConfigured
            ? 'Showing Viselle Inbox tickets plus unlinked Linear project issues (mirrored Inbox tickets stay as Viselle rows).'
            : 'Linear API keys are not configured on the API — only Viselle Inbox tickets are available.'}
          {linearError ? ` ${linearError}` : ''}
        </p>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title="No tickets" description="Nothing matches this filter right now." />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-stone-300"
                    checked={allVisibleSelected}
                    onChange={(e) => toggleAllVisible(e.target.checked)}
                    aria-label="Select all visible tickets"
                  />
                </TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) =>
                row.kind === 'viselle' ? (
                  <ViselleTicketRow
                    key={row.key}
                    ticket={row.ticket}
                    selected={selectedViselle.includes(row.ticket.id)}
                    onToggle={toggleSelectViselle}
                    onSend={() => sendToAgent([row.ticket.id], [])}
                    sending={briefMutation.isPending}
                  />
                ) : (
                  <LinearIssueRow
                    key={row.key}
                    issue={row.issue}
                    selected={selectedLinear.includes(row.issue.id)}
                    onToggle={toggleSelectLinear}
                    onSend={() => sendToAgent([], [row.issue.id])}
                    sending={briefMutation.isPending}
                  />
                ),
              )}
            </TableBody>
          </Table>
        </Panel>
      )}

      {selectedCount > 0 ? (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {selectedCount} selected — handoff builds a Cursor agent prompt, marks Viselle tickets In
          Progress, and mirrors to Linear when configured.
        </p>
      ) : null}

      <Dialog open={!!brief} onOpenChange={(open) => !open && setBrief(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send to Cursor agent</DialogTitle>
            <DialogDescription>
              The web app cannot open Cursor Composer directly. Copy this prompt into a new Agent chat
              in Cursor.
              {brief?.linearSynced ? ' Linked Linear issues were updated where possible.' : ''}
            </DialogDescription>
          </DialogHeader>

          <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600 dark:text-stone-300">
            {(brief?.instructions ?? []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <Textarea readOnly value={brief?.prompt ?? ''} rows={14} className="font-mono text-xs" />

          <div className="flex flex-wrap gap-2">
            <Button onClick={copyPrompt}>
              <Copy className="h-4 w-4" />
              Copy prompt
            </Button>
            <Button variant="outline" onClick={() => setBrief(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ViselleTicketRow({
  ticket,
  selected,
  onToggle,
  onSend,
  sending,
}: {
  ticket: SupportTicket;
  selected: boolean;
  onToggle: (id: string, on: boolean) => void;
  onSend: () => void;
  sending: boolean;
}) {
  return (
    <TableRow>
      <TableCell>
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-stone-300"
          checked={selected}
          onChange={(e) => onToggle(ticket.id, e.target.checked)}
          aria-label={`Select ${ticket.subject}`}
        />
      </TableCell>
      <TableCell className="font-medium">
        <Link to={`/platform/support/${ticket.id}`} className="block hover:underline">
          {ticket.subject}
        </Link>
        {ticket.linearIssueIdentifier ? (
          <a
            href={ticket.linearIssueUrl || undefined}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-stone-400 hover:underline"
          >
            {ticket.linearIssueIdentifier}
          </a>
        ) : null}
      </TableCell>
      <TableCell>
        <TicketTypeBadge type={ticket.type} />
      </TableCell>
      <TableCell className="text-stone-500">
        <div>{ticket.creatorEmail}</div>
        <div className="text-xs capitalize text-stone-400">{ticket.creatorRole.replace('_', ' ')}</div>
      </TableCell>
      <TableCell>
        <TicketStatusBadge status={ticket.status} />
      </TableCell>
      <TableCell className="text-stone-500">{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" disabled={sending} onClick={onSend}>
          <Bot className="h-4 w-4" />
          Send
        </Button>
      </TableCell>
    </TableRow>
  );
}

function LinearIssueRow({
  issue,
  selected,
  onToggle,
  onSend,
  sending,
}: {
  issue: InboxLinearIssue;
  selected: boolean;
  onToggle: (id: string, on: boolean) => void;
  onSend: () => void;
  sending: boolean;
}) {
  return (
    <TableRow>
      <TableCell>
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-stone-300"
          checked={selected}
          onChange={(e) => onToggle(issue.id, e.target.checked)}
          aria-label={`Select ${issue.title}`}
        />
      </TableCell>
      <TableCell className="font-medium">
        <a href={issue.url} target="_blank" rel="noreferrer" className="block hover:underline">
          {issue.title}
        </a>
        <span className="text-xs text-stone-400">{issue.identifier}</span>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">Linear</Badge>
      </TableCell>
      <TableCell className="text-stone-500">
        <div>Linear project</div>
        <div className="text-xs text-stone-400">Not from Viselle Inbox</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{issue.stateName}</Badge>
      </TableCell>
      <TableCell className="text-stone-500">{new Date(issue.updatedAt).toLocaleDateString()}</TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" disabled={sending} onClick={onSend}>
          <Bot className="h-4 w-4" />
          Send
        </Button>
      </TableCell>
    </TableRow>
  );
}
