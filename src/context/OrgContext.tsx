import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ownerApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Organization } from '@/types/api';

const SELECTED_ORG_KEY = 'viselle_selected_org';

interface OrgContextValue {
  selectedOrgId: string | null;
  selectedOrg: Organization | null;
  organizations: Organization[];
  isLoadingOrgs: boolean;
  setSelectedOrgId: (id: string | null) => void;
  effectiveOrgId: string | null;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(
    () => localStorage.getItem(SELECTED_ORG_KEY),
  );

  const { data, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['owner', 'organizations'],
    queryFn: ownerApi.listOrganizations,
    enabled: user?.role === 'platform_owner',
  });

  const organizations = data?.organizations ?? [];

  const setSelectedOrgId = useCallback((id: string | null) => {
    setSelectedOrgIdState(id);
    if (id) {
      localStorage.setItem(SELECTED_ORG_KEY, id);
    } else {
      localStorage.removeItem(SELECTED_ORG_KEY);
    }
  }, []);

  const selectedOrg = useMemo(
    () => organizations.find((o) => o.id === selectedOrgId) ?? null,
    [organizations, selectedOrgId],
  );

  const effectiveOrgId = useMemo(() => {
    if (user?.role === 'platform_owner') return selectedOrgId;
    if (user?.role === 'org_owner' || user?.role === 'staff') return user.organizationId ?? null;
    return null;
  }, [user, selectedOrgId]);

  const value = useMemo(
    () => ({
      selectedOrgId,
      selectedOrg,
      organizations,
      isLoadingOrgs,
      setSelectedOrgId,
      effectiveOrgId,
    }),
    [selectedOrgId, selectedOrg, organizations, isLoadingOrgs, setSelectedOrgId, effectiveOrgId],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}
