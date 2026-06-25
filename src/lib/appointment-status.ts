import type { PaymentStatus, VisitStatus } from '@/types/api';

export type AppointmentCalendarState =
  | 'awaiting_check_in'
  | 'checked_in'
  | 'missed'
  | 'paid'
  | 'cancelled';

export function getAppointmentCalendarState(
  visitStatus: VisitStatus,
  paymentStatus: PaymentStatus,
): AppointmentCalendarState {
  if (visitStatus === 'cancelled') return 'cancelled';
  if (visitStatus === 'missed') return 'missed';
  if (visitStatus === 'arrived' && paymentStatus === 'paid') return 'paid';
  if (visitStatus === 'arrived') return 'checked_in';
  return 'awaiting_check_in';
}

export const APPOINTMENT_CALENDAR_LIP_CLASS: Record<AppointmentCalendarState, string> = {
  awaiting_check_in: 'bg-sky-500',
  checked_in: 'bg-emerald-500',
  missed: 'bg-amber-500',
  paid: 'bg-violet-500',
  cancelled: 'bg-red-500',
};

export const APPOINTMENT_CALENDAR_LIP_LABEL: Record<AppointmentCalendarState, string> = {
  awaiting_check_in: 'Awaiting check-in',
  checked_in: 'Checked in',
  missed: 'Missed',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export function getAppointmentCalendarLipClass(
  visitStatus: VisitStatus,
  paymentStatus: PaymentStatus,
): string {
  return APPOINTMENT_CALENDAR_LIP_CLASS[getAppointmentCalendarState(visitStatus, paymentStatus)];
}

export function getAppointmentCalendarLipLabel(
  visitStatus: VisitStatus,
  paymentStatus: PaymentStatus,
): string {
  return APPOINTMENT_CALENDAR_LIP_LABEL[getAppointmentCalendarState(visitStatus, paymentStatus)];
}
