import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Panel, sectionMutedClass } from '@/components/common/Panel';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { formatMembershipPoints } from '@/lib/membership-points';
import { cn, formatCurrency } from '@/lib/utils';
import type { Customer, CustomerMembership, MembershipPlan } from '@/types/api';

function centsFromDollars(dollars: string): number {
  return Math.round(Number(dollars) * 100);
}

function personName(customer: Customer | undefined): string {
  if (!customer) return 'Unknown guest';
  return `${customer.firstName} ${customer.lastName}`.trim();
}

export function MembershipsPage() {
  const orgId = useOrgId();
  const trialLocked = useOrgWriteLocked();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [name, setName] = useState('');
  const [points, setPoints] = useState('100');
  const [price, setPrice] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');

  const plansQuery = useQuery({
    queryKey: ['membership-plans', orgId],
    queryFn: () => orgApi.listMembershipPlans(orgId),
    enabled: !!orgId,
  });
  const membershipsQuery = useQuery({
    queryKey: ['customer-memberships', orgId],
    queryFn: () => orgApi.listCustomerMemberships(orgId),
    enabled: !!orgId,
  });
  const customersQuery = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId,
  });

  const plans = plansQuery.data?.plans ?? [];
  const memberships = membershipsQuery.data?.memberships ?? [];
  const customers = customersQuery.data?.customers ?? [];
  const customersById = useMemo(
    () => Object.fromEntries(customers.map((customer) => [customer.id, customer] as const)),
    [customers],
  );
  const plansById = useMemo(
    () => Object.fromEntries(plans.map((plan) => [plan.id, plan] as const)),
    [plans],
  );
  const activePlans = plans.filter((plan) => plan.isActive);

  const createMutation = useMutation({
    mutationFn: () =>
      orgApi.createMembershipPlan(orgId, {
        name: name.trim(),
        points: Math.max(1, Math.floor(Number(points) || 0)),
        priceCents: centsFromDollars(price),
      }),
    onSuccess: () => {
      toast.success('Membership plan saved');
      setCreateOpen(false);
      setName('');
      setPoints('100');
      setPrice('');
      void queryClient.invalidateQueries({ queryKey: ['membership-plans', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not create this membership')),
  });

  const subscribeMutation = useMutation({
    mutationFn: () => orgApi.subscribeMembership(orgId, { planId, customerId }),
    onSuccess: () => {
      toast.success('Membership started. Points were added to their account.');
      setSubscribeOpen(false);
      setCustomerId('');
      setPlanId('');
      void queryClient.invalidateQueries({ queryKey: ['customer-memberships', orgId] });
      void queryClient.invalidateQueries({ queryKey: ['customers', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not start this membership')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ membershipId, status }: { membershipId: string; status: CustomerMembership['status'] }) =>
      orgApi.setMembershipStatus(orgId, membershipId, { status }),
    onSuccess: () => {
      toast.success('Membership updated');
      void queryClient.invalidateQueries({ queryKey: ['customer-memberships', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not update this membership')),
  });

  const renewMutation = useMutation({
    mutationFn: (membershipId: string) => orgApi.renewMembershipYear(orgId, membershipId),
    onSuccess: () => {
      toast.success('Year recorded. Another year of points was added.');
      void queryClient.invalidateQueries({ queryKey: ['customer-memberships', orgId] });
      void queryClient.invalidateQueries({ queryKey: ['customers', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not renew this membership')),
  });

  if (plansQuery.isLoading || membershipsQuery.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <p className={sectionMutedClass}>
        A membership adds points the guest can spend at checkout. They pay throughout the year; points land when they
        join, when they upgrade, and when you record the yearly renewal. Upgrading only adds the extra points — leftover
        points stay.
      </p>

      <div className="flex justify-end">
        <TrialLockedControl locked={trialLocked}>
          <Button type="button" onClick={() => setCreateOpen(true)} disabled={trialLocked}>
            New plan
          </Button>
        </TrialLockedControl>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No memberships yet"
          description="Create Bronze, Gold, or any yearly plan. Each one adds a set number of points."
        />
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Yearly price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{formatMembershipPoints(plan.points)}</TableCell>
                  <TableCell>{formatCurrency(plan.priceCents)}</TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? 'success' : 'secondary'}>
                      {plan.isActive ? 'Active' : 'Off'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Members</h2>
        <TrialLockedControl locked={trialLocked}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSubscribeOpen(true)}
            disabled={trialLocked || activePlans.length === 0 || customers.length === 0}
          >
            Start membership
          </Button>
        </TrialLockedControl>
      </div>

      {memberships.length === 0 ? (
        <p className={cn('text-sm', sectionMutedClass)}>No one is on a membership yet.</p>
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Next year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.map((membership) => (
                <MembershipRow
                  key={membership.id}
                  membership={membership}
                  customer={customersById[membership.customerId]}
                  plan={plansById[membership.planId]}
                  trialLocked={trialLocked}
                  onPause={() => statusMutation.mutate({ membershipId: membership.id, status: 'paused' })}
                  onCancel={() => statusMutation.mutate({ membershipId: membership.id, status: 'cancelled' })}
                  onRenew={() => renewMutation.mutate(membership.id)}
                />
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New membership</DialogTitle>
            <DialogDescription>
              Yearly plan. Collect payment throughout the year however you do today. Points are added when they join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="membership-name">Name</Label>
              <Input id="membership-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Gold" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="membership-points">Points added each year</Label>
              <Input
                id="membership-points"
                inputMode="numeric"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
              <p className={sectionMutedClass}>1 point = $1 at checkout.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="membership-price">Yearly price ($)</Label>
              <Input
                id="membership-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createMutation.isPending || !name.trim() || Number(points) < 1}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Saving…' : 'Create plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subscribeOpen} onOpenChange={setSubscribeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start membership</DialogTitle>
            <DialogDescription>
              If they already have an active membership, choosing a higher plan only adds the extra points.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {personName(customer)} · {formatMembershipPoints(customer.membershipPoints ?? 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a plan" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} · {formatMembershipPoints(plan.points)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSubscribeOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={subscribeMutation.isPending || !customerId || !planId}
              onClick={() => subscribeMutation.mutate()}
            >
              {subscribeMutation.isPending ? 'Saving…' : 'Add points'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MembershipRow({
  membership,
  customer,
  plan,
  trialLocked,
  onPause,
  onCancel,
  onRenew,
}: {
  membership: CustomerMembership;
  customer?: Customer;
  plan?: MembershipPlan;
  trialLocked: boolean;
  onPause: () => void;
  onCancel: () => void;
  onRenew: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{personName(customer)}</TableCell>
      <TableCell>{plan?.name ?? 'Plan'}</TableCell>
      <TableCell>{formatMembershipPoints(customer?.membershipPoints ?? 0)}</TableCell>
      <TableCell>{membership.nextBillOn}</TableCell>
      <TableCell>
        <Badge variant={membership.status === 'active' ? 'success' : 'secondary'}>{membership.status}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {membership.status === 'active' ? (
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" disabled={trialLocked} onClick={onRenew}>
              Renew year
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={trialLocked} onClick={onPause}>
              Pause
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={trialLocked} onClick={onCancel}>
              Cancel
            </Button>
          </div>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
