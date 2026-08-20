import type { AuthUser } from '@/types/api';

/** Dashboard/calendar home for a signed-in user (after login or signup handoff). */
export function signedInHomePath(user: Pick<AuthUser, 'role' | 'organizationId'>): string {
  if (user.role === 'platform_owner') return '/platform/dashboard';
  if (!user.organizationId) return '/login';
  if (user.role === 'org_owner') return `/orgs/${user.organizationId}/dashboard`;
  return `/orgs/${user.organizationId}/calendar`;
}
