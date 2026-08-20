import { useOrgMustChoosePlan } from '@/hooks/useOrgMustChoosePlan';
import { useOrgProductClosed } from '@/hooks/useOrgProductClosed';

/**
 * True when the product shell should collapse to billing/reactivate (or
 * choose-a-plan): unpaid/no-Stripe, hard-canceled, or expire-job.
 */
export function useOrgNeedsBilling(): boolean {
  const mustChoosePlan = useOrgMustChoosePlan();
  const productClosed = useOrgProductClosed();
  return mustChoosePlan || productClosed;
}
