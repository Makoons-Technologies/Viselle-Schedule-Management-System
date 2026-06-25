import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { centsToDollars, formatDate } from '@/lib/utils';
import { BillingStatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BillingStatus } from '@/types/api';

const BILLING_STATUSES: BillingStatus[] = ['active', 'trial', 'past_due', 'failed', 'cancelled'];

interface PlatformOrgBillingSectionProps {
  orgId: string;
}

export function PlatformOrgBillingSection({ orgId }: PlatformOrgBillingSectionProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['owner-billing', orgId],
    queryFn: () => ownerApi.getBilling(orgId),
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: (billingStatus: BillingStatus) => ownerApi.updateBilling(orgId, { billingStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-billing', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'organizations'] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'stats'] });
      toast.success('Billing updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState />;

  const billing = data?.billing;
  if (!billing) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Billing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Status</Label>
            <div className="mt-1">
              <BillingStatusBadge status={billing.billingStatus} />
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-stone-500">Monthly</p>
            <p className="font-semibold text-stone-900">${centsToDollars(billing.monthlyPriceCents)}</p>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Update billing status</Label>
          <Select
            value={billing.billingStatus}
            onValueChange={(v) => updateMutation.mutate(v as BillingStatus)}
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BILLING_STATUSES.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(billing.lastPaymentAt || billing.nextPaymentDueAt) && (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {billing.lastPaymentAt && (
              <div>
                <p className="text-stone-500">Last payment</p>
                <p className="font-medium text-stone-900">{formatDate(billing.lastPaymentAt)}</p>
              </div>
            )}
            {billing.nextPaymentDueAt && (
              <div>
                <p className="text-stone-500">Next payment due</p>
                <p className="font-medium text-stone-900">{formatDate(billing.nextPaymentDueAt)}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
