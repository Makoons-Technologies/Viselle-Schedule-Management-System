import type { ReceiptChannel } from '@/types/api';

const KEY = 'viselle.receiptChannel';

const CHANNELS: ReceiptChannel[] = ['print', 'sms', 'email', 'none'];

export function getLastReceiptChannel(): ReceiptChannel | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(KEY);
  return CHANNELS.includes(value as ReceiptChannel) ? (value as ReceiptChannel) : null;
}

export function rememberReceiptChannel(channel: ReceiptChannel): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, channel);
}
