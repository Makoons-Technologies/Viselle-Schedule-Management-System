import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useOrgAdminAccess(orgId: string | undefined) {
  const { user, memberships } = useAuth();

  return useMemo(() => {
    if (!user || !orgId) return false;
    if (user.role === 'platform_owner' || user.role === 'org_owner') return true;
    if (user.role === 'staff') {
      const membership = memberships.find((item) => item.organizationId === orgId);
      return membership?.accountRole === 'admin' || membership?.accountRole === 'org_owner';
    }
    return false;
  }, [user, memberships, orgId]);
}
