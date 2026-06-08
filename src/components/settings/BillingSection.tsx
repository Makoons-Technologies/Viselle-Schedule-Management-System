import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { BillingStatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BillingStatus } from '@/types/api';

interface BillingSectionProps {
  orgId: string;
}

export function BillingSection({ orgId }: BillingSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isPlatformOwner = user?.role === 'platform_owner';

  const { data, isLoading, error } = useQuery({
    queryKey: ['billing', orgId],
    queryFn: () => ownerApi.getBilling(orgId),
    enabled: !!orgId && isPlatformOwner,
  });

  const updateMutation = useMutation({
    mutationFn: (billingStatus: BillingStatus) =>
      ownerApi.updateBilling(orgId, { billingStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isPlatformOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">
            Billing is managed by your platform administrator. Contact support for billing inquiries.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-red-600">Failed to load billing information.</p>;

  const billing = data?.billing;

  return (
    <div className="space-y-4">
      {billing && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm text-stone-500">Monthly Price</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(billing.monthlyPriceCents)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-stone-500">Status</CardTitle></CardHeader>
            <CardContent><BillingStatusBadge status={billing.billingStatus} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-stone-500">Last Payment</CardTitle></CardHeader>
            <CardContent><p>{billing.lastPaymentAt ? formatDate(billing.lastPaymentAt) : '—'}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-stone-500">Next Due</CardTitle></CardHeader>
            <CardContent><p>{billing.nextPaymentDueAt ? formatDate(billing.nextPaymentDueAt) : '—'}</p></CardContent>
          </Card>
        </div>
      )}
      {billing && (
        <div className="flex items-center gap-3">
          <Select value={billing.billingStatus} onValueChange={(v) => updateMutation.mutate(v as BillingStatus)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['active', 'past_due', 'failed', 'cancelled', 'trial'] as BillingStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {updateMutation.isPending && <p className="text-xs text-stone-500">Saving…</p>}
        </div>
      )}
    </div>
  );
}
