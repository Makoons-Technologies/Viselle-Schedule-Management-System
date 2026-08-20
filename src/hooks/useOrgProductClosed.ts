import { useOrgCanceled } from '@/hooks/useOrgCanceled';
import { useOrgTrialExpired } from '@/hooks/useOrgTrialExpired';

/**
 * Product shell collapsed to Plan / Account: hard-canceled or expire-job.
 * Use isOrgCanceled / isOrgTrialExpired for distinct banner copy.
 */
export function useOrgProductClosed(): boolean {
  const canceled = useOrgCanceled();
  const trialExpired = useOrgTrialExpired();
  return canceled || trialExpired;
}
