import type { Appointment, RecurringAppointmentRule } from '@/types/api';

type RecurringLinkedAppointment = Pick<
  Appointment,
  'id' | 'startTime' | 'recurringAppointmentRuleId' | 'visitStatus' | 'paymentStatus'
>;

/**
 * Cancelled recurring series should not fill the calendar with distant future instances.
 * Keep past occurrences; drop all future ones from cancelled rules and future cancelled series instances.
 */
export function filterCancelledRecurringSeries<T extends RecurringLinkedAppointment>(
  appointments: T[],
  recurringRules: RecurringAppointmentRule[],
  now: Date = new Date(),
): T[] {
  const cancelledRuleIds = new Set(
    recurringRules.filter((rule) => rule.status === 'cancelled').map((rule) => rule.id),
  );

  return appointments.filter((appointment) => {
    const ruleId = appointment.recurringAppointmentRuleId;
    if (!ruleId) return true;

    const isFuture = new Date(appointment.startTime) >= now;
    if (!isFuture) return true;

    if (cancelledRuleIds.has(ruleId)) return false;
    if (appointment.visitStatus === 'cancelled') return false;

    return true;
  });
}
