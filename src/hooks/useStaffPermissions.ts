import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orgApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useOrgAdminAccess } from '@/hooks/useOrgAdminAccess';
import { DEFAULT_STAFF_PERMISSIONS, type StaffPermissions } from '@/types/api';

function permissionsFromOrganization(org: {
  staffCanManageOwnSchedule: boolean;
  staffCanCreateAppointments: boolean;
  staffCanCancelAppointments: boolean;
  staffCanManageVisitPayment: boolean;
  staffCanAddCheckoutProducts: boolean;
  staffCanBatchCheckout: boolean;
}): StaffPermissions {
  return {
    canManageOwnSchedule: org.staffCanManageOwnSchedule,
    canCreateAppointments: org.staffCanCreateAppointments,
    canCancelAppointments: org.staffCanCancelAppointments,
    canManageVisitPayment: org.staffCanManageVisitPayment,
    canAddCheckoutProducts: org.staffCanAddCheckoutProducts,
    canBatchCheckout: org.staffCanBatchCheckout,
  };
}

export function useStaffPermissions(orgId: string | undefined) {
  const { user } = useAuth();
  const isManager = useOrgAdminAccess(orgId);

  const { data, isLoading } = useQuery({
    queryKey: ['organization', orgId, 'permissions'],
    queryFn: () => orgApi.getOrganization(orgId!),
    enabled: !!orgId,
  });

  const permissions = useMemo((): StaffPermissions => {
    if (isManager) {
      return {
        canManageOwnSchedule: true,
        canCreateAppointments: true,
        canCancelAppointments: true,
        canManageVisitPayment: true,
        canAddCheckoutProducts: true,
        canBatchCheckout: true,
      };
    }

    const org = data?.organization;
    if (!org) return DEFAULT_STAFF_PERMISSIONS;
    return permissionsFromOrganization(org);
  }, [isManager, data?.organization]);

  const isStaffMember = user?.role === 'staff' && !isManager;

  return { permissions, isManager, isStaffMember, isLoading };
}
