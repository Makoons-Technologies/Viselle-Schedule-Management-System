import { useOrgCanceled } from '@/hooks/useOrgCanceled';
import { useOrgMustChoosePlan } from '@/hooks/useOrgMustChoosePlan';

/**
 * True when the product shell should collapse to billing/reactivate (or
 * choose-a-plan): unpaid/no-Stripe, or billing status is cancelled.
 */
export function useOrgNeedsBilling(): boolean {
  const mustChoosePlan = useOrgMustChoosePlan();
  const canceled = useOrgCanceled();
  return mustChoosePlan || canceled;
}
