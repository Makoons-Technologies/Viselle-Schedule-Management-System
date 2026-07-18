import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, getStoredToken, setStoredToken } from '@/lib/api';
import type { AuthUser, StaffMembership } from '@/types/api';

interface AuthContextValue {
  user: AuthUser | null;
  memberships: StaffMembership[];
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  completePasswordSetup: (token: string, password: string) => Promise<AuthUser>;
  switchOrganization: (organizationId: string) => Promise<AuthUser>;
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
    return applyAuthSession(queryClient, result);
  }, [queryClient]);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const memberships = user?.memberships ?? [];

  const value = useMemo(
    () => ({
      user: user ?? null,
      memberships,
      token,
      isLoading: !!token && isLoading,
      isAuthenticated: !!token && !!user,
      login,
      completePasswordSetup,
      switchOrganization,
      logout,
    }),
    [user, memberships, token, isLoading, login, completePasswordSetup, switchOrganization, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
