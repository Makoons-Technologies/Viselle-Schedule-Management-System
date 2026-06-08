import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, getStoredToken, setStoredToken } from '@/lib/api';
import type { AuthUser } from '@/types/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
    setStoredToken(result.token);
    setToken(result.token);
    queryClient.setQueryData(['auth', 'me'], result.user);
    return result.user;
  }, [queryClient]);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user: user ?? null,
      token,
      isLoading: !!token && isLoading,
      isAuthenticated: !!token && !!user,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
