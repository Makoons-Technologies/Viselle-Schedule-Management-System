import type { SupportTicketStatus, SupportTicketType } from '@/types/api';

export const SUPPORT_TICKET_TYPES: SupportTicketType[] = ['support', 'feature_request', 'bug'];

export const SUPPORT_TICKET_TYPE_LABELS: Record<SupportTicketType, string> = {
  support: 'Support',
  feature_request: 'Feature request',
  bug: 'Bug report',
};

export const SUPPORT_TICKET_STATUSES: SupportTicketStatus[] = [
  'open',
  'in_progress',
  'qa_ready',
  'done',
  'canceled',
];

export const SUPPORT_TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  qa_ready: 'QA Ready',
  done: 'Done',
  canceled: 'Canceled',
};

/** Maps Viselle Inbox status → Linear workflow state name (current team). */
export const INBOX_STATUS_TO_LINEAR: Record<SupportTicketStatus, string> = {
  open: 'Todo',
  in_progress: 'In Progress',
  qa_ready: 'In Review',
  done: 'Done',
  canceled: 'Canceled',
};

export const INBOX_SHOW_LINEAR_STORAGE_KEY = 'viselle.inbox.showLinearProjectTickets';
