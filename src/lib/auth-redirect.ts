import type { AuthUser } from '@/types/api';

/** Dashboard/calendar home for a signed-in user (after login or signup handoff). */
export function signedInHomePath(user: Pick<AuthUser, 'role' | 'organizationId'>): string {
  if (user.role === 'platform_owner') return '/platform/dashboard';
  if (!user.organizationId) return '/login';
  if (user.role === 'org_owner') return `/orgs/${user.organizationId}/dashboard`;
  return `/orgs/${user.organizationId}/calendar`;
}

/** Typed `/dashboard` — same home as login, not the marketing 404. */
export function typedDashboardPath(user: Pick<AuthUser, 'role' | 'organizationId'>): string {
  return signedInHomePath(user);
}

/**
 * Typed `/settings/hours` — Hours in the owner tour is Availability.
 * Staff hours live at `/staff/availability`.
 */
export function typedHoursPath(user: Pick<AuthUser, 'role' | 'organizationId'>): string {
  if (user.role === 'platform_owner') return '/platform/dashboard';
  if (!user.organizationId) return '/login';
  if (user.role === 'staff') return '/staff/availability';
  return `/orgs/${user.organizationId}/availability`;
}
