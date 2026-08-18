import type { Reminder } from '@/types/api';

export function reminderChannelLabel(type: Reminder['type']): string {
  if (type === 'sms') return 'Text';
  if (type === 'push') return 'Push';
  return 'Email';
}

export function reminderKindLabel(reminder: Pick<Reminder, 'purpose' | 'audience'>): string {
  const staff = reminder.audience === 'staff';
  switch (reminder.purpose) {
    case 'confirmation':
      return staff ? 'Staff booking confirmation' : 'Booking confirmation';
    case 'confirmation_request':
      return staff ? 'Staff confirm request' : 'Confirm request';
    case 'update':
      return staff ? 'Staff update notice' : 'Update notice';
    case 'cancellation':
      return staff ? 'Staff cancellation notice' : 'Cancellation notice';
    default:
      return staff ? 'Staff last reminder' : 'Last reminder';
  }
}

export function reminderRowLabel(reminder: Reminder): string {
  return `${reminderChannelLabel(reminder.type)} · ${reminderKindLabel(reminder)}`;
}

export function reminderStatusLabel(
  reminder: Reminder,
  smsSendingOn: boolean,
): string {
  if (reminder.type === 'sms' && reminder.status === 'pending' && !smsSendingOn) {
    return 'paused';
  }
  return reminder.status;
}
