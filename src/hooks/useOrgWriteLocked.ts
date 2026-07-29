import { useAuth } from '@/context/AuthContext';
import { useOrgMustChoosePlan } from '@/hooks/useOrgMustChoosePlan';
import { useOrgTrialExpired } from '@/hooks/useOrgTrialExpired';

/**
 * True when org-mutating UI should be disabled: expired trial, or (for
 * org_owner/staff) the org must still choose/subscribe to a plan.
 *
 * Platform owners keep write access for salon administration even when the
 * org still needs a Stripe subscription — the API skips the plan gate for them.
 */
export function useOrgWriteLocked(): boolean {
  const { user } = useAuth();
  const trialExpired = useOrgTrialExpired();
  const mustChoosePlan = useOrgMustChoosePlan();

  if (user?.role === 'platform_owner') return trialExpired;
  return trialExpired || mustChoosePlan;
}
