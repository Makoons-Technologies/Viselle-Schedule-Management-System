import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  authApi,
  getImpersonationOriginToken,
  getStoredToken,
  ownerApi,
  setImpersonationOriginToken,
  setStoredToken,
} from '@/lib/api';
import type { AuthUser, LeaveOrDeleteOrgResponse, StaffMembership } from '@/types/api';

interface AuthContextValue {
  user: AuthUser | null;
  memberships: StaffMembership[];
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  completePasswordSetup: (token: string, password: string) => Promise<AuthUser>;
  switchOrganization: (organizationId: string) => Promise<AuthUser>;
  leaveOrganization: (organizationId: string) => Promise<LeaveOrDeleteOrgResponse>;
  applyLeaveOrDeleteResult: (result: LeaveOrDeleteOrgResponse) => void;
  loginAsOwner: (organizationId: string) => Promise<{ user: AuthUser; organization: { id: string; name: string } }>;
  exitImpersonation: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applyAuthSession(
  queryClient: ReturnType<typeof useQueryClient>,
  result: { token: string; user: AuthUser; memberships?: StaffMembership[] },
) {
  setStoredToken(result.token);
  const user = {
    ...result.user,
    memberships: result.memberships ?? result.user.memberships,
  };
  queryClient.setQueryData(['auth', 'me'], user);
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (!token) {
      queryClient.removeQueries({ queryKey: ['auth', 'me'] });
    }
  }, [token, queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    setToken(result.token);
    return applyAuthSession(queryClient, result);
  }, [queryClient]);

  const completePasswordSetup = useCallback(async (setupToken: string, password: string) => {
    const result = await authApi.setPassword(setupToken, password);
    setToken(result.token);
    return applyAuthSession(queryClient, result);
  }, [queryClient]);

  const switchOrganization = useCallback(async (organizationId: string) => {
    const result = await authApi.switchOrganization(organizationId);
    setToken(result.token);
    queryClient.clear();
    return applyAuthSession(queryClient, result);
  }, [queryClient]);

  const logout = useCallback(() => {
    setStoredToken(null);
    setImpersonationOriginToken(null);
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const applyLeaveOrDeleteResult = useCallback(
    (result: LeaveOrDeleteOrgResponse) => {
      if (result.outcome === 'logged_out') {
        logout();
        return;
      }
      setToken(result.token);
      queryClient.clear();
      applyAuthSession(queryClient, result);
    },
    [logout, queryClient],
  );

  const leaveOrganization = useCallback(
    async (organizationId: string) => {
      const result = await authApi.leaveOrganization(organizationId);
      applyLeaveOrDeleteResult(result);
      return result;
    },
    [applyLeaveOrDeleteResult],
  );

  const loginAsOwner = useCallback(async (organizationId: string) => {
    const originToken = getStoredToken();
    const result = await ownerApi.impersonateOwner(organizationId);
    if (originToken) {
      setImpersonationOriginToken(originToken);
    }
    setToken(result.token);
    const impersonatedUser = applyAuthSession(queryClient, result);
    return { user: impersonatedUser, organization: result.organization };
  }, [queryClient]);

  const exitImpersonation = useCallback(() => {
    const originToken = getImpersonationOriginToken();
    setImpersonationOriginToken(null);
    if (!originToken) {
      logout();
      return;
    }
    setStoredToken(originToken);
    setToken(originToken);
    queryClient.removeQueries({ queryKey: ['auth', 'me'] });
  }, [queryClient, logout]);

  const memberships = user?.memberships ?? [];
  const isImpersonating = !!user?.impersonatedBy;

  const value = useMemo(
    () => ({
      user: user ?? null,
      memberships,
      token,
      isLoading: !!token && isLoading,
      isAuthenticated: !!token && !!user,
      isImpersonating,
      login,
      completePasswordSetup,
      switchOrganization,
      leaveOrganization,
      applyLeaveOrDeleteResult,
      loginAsOwner,
      exitImpersonation,
      logout,
    }),
    [
      user,
      memberships,
      token,
      isLoading,
      isImpersonating,
      login,
      completePasswordSetup,
      switchOrganization,
      leaveOrganization,
      applyLeaveOrDeleteResult,
      loginAsOwner,
      exitImpersonation,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
