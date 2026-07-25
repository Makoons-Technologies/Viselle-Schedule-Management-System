import type { SupportTicketType } from '@/types/api';

export const SUPPORT_TICKET_TYPES: SupportTicketType[] = ['support', 'feature_request', 'bug'];

export const SUPPORT_TICKET_TYPE_LABELS: Record<SupportTicketType, string> = {
  support: 'Support',
  feature_request: 'Feature request',
  bug: 'Bug report',
};

export const INBOX_TYPE_TABS: Array<{ value: SupportTicketType; label: string }> = [
  { value: 'support', label: 'Support' },
  { value: 'feature_request', label: 'Feature requests' },
  { value: 'bug', label: 'Bug reports' },
];
