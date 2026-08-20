import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { typedDashboardPath, typedHoursPath } from '@/lib/auth-redirect';
import { LoadingState } from '@/components/common/LoadingState';
import type { AuthUser } from '@/types/api';

function SignedInRedirect({
  to,
}: {
  to: (user: Pick<AuthUser, 'role' | 'organizationId'>) => string;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={to(user)} replace />;
}

/** Typed `/dashboard` → platform dashboard, org dashboard, or staff calendar. */
export function TypedDashboardRedirect() {
  return <SignedInRedirect to={typedDashboardPath} />;
}

/** Typed `/settings/hours` → availability (Hours in the owner tour). */
export function TypedHoursRedirect() {
  return <SignedInRedirect to={typedHoursPath} />;
}

/** Typed `/logout` — same as the header icon. */
export function LogoutRedirect() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return <Navigate to="/login" replace />;
}
