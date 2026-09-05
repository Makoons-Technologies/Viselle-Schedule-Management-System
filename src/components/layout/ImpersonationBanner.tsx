import { UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

/**
 * Persistent banner shown while a platform_owner is impersonating an
 * org_owner, so it's always obvious you're "inside" someone else's
 * organization and there's a one-click way back to the platform.
 */
export function ImpersonationBanner() {
  const { user, isImpersonating, exitImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleExit = () => {
    exitImpersonation();
    navigate('/platform/organizations');
  };

  return (
    <div
      data-testid="impersonation-banner"
      className="app-shell-impersonation-banner flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1.5 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950 sm:flex-nowrap sm:justify-between sm:text-left"
    >
      {/*
        One orange box from y=0. CSS adds env(safe-area-inset-top) to
        padding-top so glyphs start below frost — not a sibling slab
        (PR 60 gap) and not flush text in the frost (PR 61).
      */}
      <span data-testid="impersonation-banner-text" className="flex items-center gap-2">
        <UserCog className="h-4 w-4 shrink-0" aria-hidden="true" />
        Viewing as {user?.email} (org owner)
      </span>
      <Button
        size="sm"
        onClick={handleExit}
        className="h-7 shrink-0 rounded-full bg-amber-950 px-3 text-xs font-semibold text-amber-50 hover:bg-amber-900"
      >
        Exit to platform
      </Button>
    </div>
  );
}
