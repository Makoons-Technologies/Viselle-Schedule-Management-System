import type { VisitStatus } from '@/types/api';

export const VISIT_STATUS_LIP_CLASS: Record<VisitStatus, string> = {
  scheduled: 'bg-sky-500',
  arrived: 'bg-emerald-500',
  missed: 'bg-amber-500',
  cancelled: 'bg-red-500',
};

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  scheduled: 'Scheduled',
  arrived: 'Arrived',
  missed: 'Missed',
  cancelled: 'Cancelled',
};
