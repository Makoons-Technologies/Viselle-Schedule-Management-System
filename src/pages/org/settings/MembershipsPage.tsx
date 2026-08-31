import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
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
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Customer, CustomerMembership, CustomerMembershipStatus, MembershipPlan } from '@/types/api';

function centsFromDollars(dollars: string): number {
  return Math.round(Number(dollars) * 100);
}

function personName(customer: Customer | undefined): string {
  if (!customer) return 'Unknown guest';
  return `${customer.firstName} ${customer.lastName}`.trim();
}

function intervalLabel(interval: MembershipPlan['interval']): string {
  return interval === 'year' ? 'Yearly' : 'Monthly';
}

function defaultNextBillOn(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function statusLabel(status: CustomerMembershipStatus): string {
  if (status === 'paused') return 'Paused';
  if (status === 'cancelled') return 'Cancelled';
  return 'Active';
}

function statusVariant(status: CustomerMembershipStatus): 'success' | 'warning' | 'secondary' {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  return 'secondary';
}

export function MembershipsPage() {
  const orgId = useOrgId();
  const trialLocked = useOrgWriteLocked();
  const queryClient = useQueryClient();

  const [planOpen, setPlanOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CustomerMembership | null>(null);

  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planInterval, setPlanInterval] = useState<'month' | 'year'>('month');
  const [planVisits, setPlanVisits] = useState('');

  const [subscribePlanId, setSubscribePlanId] = useState('');
  const [subscribeCustomerId, setSubscribeCustomerId] = useState('');
  const [nextBillOn, setNextBillOn] = useState(defaultNextBillOn);

  const plansQuery = useQuery({
    queryKey: ['membership-plans', orgId],
    queryFn: () => orgApi.listMembershipPlans(orgId),
    enabled: !!orgId,
  });
  const membershipsQuery = useQuery({
    queryKey: ['memberships', orgId],
    queryFn: () => orgApi.listMemberships(orgId),
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
    () => Object.fromEntries((customersQuery.data?.customers ?? []).map((customer) => [customer.id, customer] as const)),
    [customersQuery.data?.customers],
  );
  const plansById = useMemo(
    () => Object.fromEntries((plansQuery.data?.plans ?? []).map((plan) => [plan.id, plan] as const)),
    [plansQuery.data?.plans],
  );

  const resetPlanForm = () => {
    setPlanName('');
    setPlanPrice('');
    setPlanInterval('month');
    setPlanVisits('');
  };

  const resetSubscribeForm = () => {
    setSubscribePlanId('');
    setSubscribeCustomerId('');
    setNextBillOn(defaultNextBillOn());
  };

  const createPlanMutation = useMutation({
    mutationFn: () => {
      const priceCents = centsFromDollars(planPrice);
      if (!planName.trim()) throw new Error('Give this plan a name');
      if (!Number.isFinite(priceCents) || priceCents < 0) throw new Error('Enter a price');
      const visitsIncluded = planVisits.trim() === '' ? null : Number(planVisits);
      if (visitsIncluded != null && (!Number.isInteger(visitsIncluded) || visitsIncluded < 0)) {
        throw new Error('Visits included must be a whole number');
      }
      return orgApi.createMembershipPlan(orgId, {
        name: planName.trim(),
        priceCents,
        interval: planInterval,
        visitsIncluded,
      });
    },
    onSuccess: () => {
      toast.success('Plan is ready');
      resetPlanForm();
      setPlanOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['membership-plans', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not create this plan')),
  });

  const deactivatePlanMutation = useMutation({
    mutationFn: (planId: string) => orgApi.updateMembershipPlan(orgId, planId, { isActive: false }),
    onSuccess: () => {
      toast.success('Plan taken off the menu');
      void queryClient.invalidateQueries({ queryKey: ['membership-plans', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not update this plan')),
  });

  const subscribeMutation = useMutation({
    mutationFn: () => {
      if (!subscribePlanId) throw new Error('Pick a plan');
      if (!subscribeCustomerId) throw new Error('Pick a guest');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextBillOn)) throw new Error('Pick the next bill date');
      return orgApi.subscribeMembership(orgId, {
        planId: subscribePlanId,
        customerId: subscribeCustomerId,
        nextBillOn,
      });
    },
    onSuccess: () => {
      toast.success('Membership started');
      resetSubscribeForm();
      setSubscribeOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['memberships', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not start this membership')),
  });

  const updateMembershipMutation = useMutation({
    mutationFn: ({
      membershipId,
      status,
    }: {
      membershipId: string;
      status: CustomerMembershipStatus;
    }) => orgApi.updateMembership(orgId, membershipId, { status }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === 'paused'
          ? 'Membership paused'
          : variables.status === 'cancelled'
            ? 'Membership cancelled'
            : 'Membership is active again',
      );
      setCancelTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['memberships', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not update this membership')),
  });

  const billMutation = useMutation({
    mutationFn: (membershipId: string) => orgApi.recordMembershipBill(orgId, membershipId),
    onSuccess: ({ membership }) => {
      toast.success(`Bill recorded. Next bill ${formatDate(membership.nextBillOn)}.`);
      void queryClient.invalidateQueries({ queryKey: ['memberships', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not record this bill')),
  });

  if (plansQuery.isLoading || membershipsQuery.isLoading) return <LoadingState />;

  const activePlans = plans.filter((plan) => plan.isActive);

  return (
    <div className="space-y-8">
      <p className={cn('-mt-2', sectionMutedClass)}>
        Monthly or yearly plans. Record a bill when you collect payment at the desk. Card autopay comes later.
      </p>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium text-stone-900 dark:text-stone-100">Plans</h2>
          <TrialLockedControl locked={trialLocked}>
            <Button
              disabled={trialLocked}
              onClick={() => {
                resetPlanForm();
                setPlanOpen(true);
              }}
            >
              New plan
            </Button>
          </TrialLockedControl>
        </div>

        {plans.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No plans yet"
            description="Add a monthly or yearly plan, then subscribe a guest when they pay at the desk."
            action={
              <TrialLockedControl locked={trialLocked}>
                <Button disabled={trialLocked} onClick={() => setPlanOpen(true)}>
                  New plan
                </Button>
              </TrialLockedControl>
            }
          />
        ) : (
          <Panel className="overflow-hidden">
            <div className="desktop-shell:hidden">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="space-y-2 border-b border-stone-100 p-4 last:border-b-0 dark:border-stone-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{plan.name}</p>
                    <Badge variant={plan.isActive ? 'success' : 'secondary'} className="shrink-0">
                      {plan.isActive ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                  <p className="text-sm text-stone-600 dark:text-stone-300">
                    {formatCurrency(plan.priceCents)} / {plan.interval === 'year' ? 'year' : 'month'}
                    {plan.visitsIncluded != null ? ` · ${plan.visitsIncluded} visits included` : ''}
                  </p>
                  {plan.isActive && (
                    <TrialLockedControl locked={trialLocked}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled={trialLocked || deactivatePlanMutation.isPending}
                        onClick={() => deactivatePlanMutation.mutate(plan.id)}
                      >
                        Deactivate
                      </Button>
                    </TrialLockedControl>
                  )}
                </div>
              ))}
            </div>
            <div className="hidden desktop-shell:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Visits included</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{formatCurrency(plan.priceCents)}</TableCell>
                      <TableCell>{intervalLabel(plan.interval)}</TableCell>
                      <TableCell>{plan.visitsIncluded ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {plan.isActive && (
                          <TrialLockedControl locked={trialLocked}>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={trialLocked || deactivatePlanMutation.isPending}
                              onClick={() => deactivatePlanMutation.mutate(plan.id)}
                            >
                              Deactivate
                            </Button>
                          </TrialLockedControl>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium text-stone-900 dark:text-stone-100">Members</h2>
          <TrialLockedControl locked={trialLocked}>
            <Button
              variant="outline"
              disabled={trialLocked || activePlans.length === 0}
              onClick={() => {
                resetSubscribeForm();
                setSubscribeOpen(true);
              }}
            >
              Subscribe a guest
            </Button>
          </TrialLockedControl>
        </div>

        {memberships.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No members yet"
            description={
              activePlans.length === 0
                ? 'Create a plan first, then subscribe a guest when they pay.'
                : 'Subscribe a guest after you collect their first payment at the desk.'
            }
          />
        ) : (
          <Panel className="overflow-hidden">
            <div className="desktop-shell:hidden">
              {memberships.map((membership) => (
                <MembershipCard
                  key={membership.id}
                  membership={membership}
                  customerName={personName(customersById[membership.customerId])}
                  plan={plansById[membership.planId]}
                  trialLocked={trialLocked}
                  busy={updateMembershipMutation.isPending || billMutation.isPending}
                  onBill={() => billMutation.mutate(membership.id)}
                  onPause={() =>
                    updateMembershipMutation.mutate({
                      membershipId: membership.id,
                      status: membership.status === 'paused' ? 'active' : 'paused',
                    })
                  }
                  onCancel={() => setCancelTarget(membership)}
                />
              ))}
            </div>
            <div className="hidden desktop-shell:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next bill</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.map((membership) => (
                    <TableRow key={membership.id}>
                      <TableCell className="font-medium">{personName(customersById[membership.customerId])}</TableCell>
                      <TableCell>{plansById[membership.planId]?.name ?? 'Plan'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(membership.status)}>{statusLabel(membership.status)}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(membership.nextBillOn)}</TableCell>
                      <TableCell>
                        <MembershipActions
                          membership={membership}
                          trialLocked={trialLocked}
                          busy={updateMembershipMutation.isPending || billMutation.isPending}
                          compact
                          onBill={() => billMutation.mutate(membership.id)}
                          onPause={() =>
                            updateMembershipMutation.mutate({
                              membershipId: membership.id,
                              status: membership.status === 'paused' ? 'active' : 'paused',
                            })
                          }
                          onCancel={() => setCancelTarget(membership)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        )}
      </section>

      <Dialog
        open={planOpen}
        onOpenChange={(open) => {
          setPlanOpen(open);
          if (!open) resetPlanForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New plan</DialogTitle>
            <DialogDescription>Set the price you collect at the desk. Autopay comes later.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createPlanMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
                placeholder="Glow Club"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plan-price">Price ($)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min={0}
                  step={0.01}
                  inputMode="decimal"
                  value={planPrice}
                  onChange={(event) => setPlanPrice(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Interval</Label>
                <Select value={planInterval} onValueChange={(value) => setPlanInterval(value as 'month' | 'year')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-visits">Visits included (optional)</Label>
              <Input
                id="plan-visits"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={planVisits}
                onChange={(event) => setPlanVisits(event.target.value)}
                placeholder="Leave blank if none"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlanOpen(false)}>
                Cancel
              </Button>
              <TrialLockedControl locked={trialLocked}>
                <Button type="submit" disabled={trialLocked || createPlanMutation.isPending}>
                  {createPlanMutation.isPending ? 'Saving…' : 'Create plan'}
                </Button>
              </TrialLockedControl>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={subscribeOpen}
        onOpenChange={(open) => {
          setSubscribeOpen(open);
          if (!open) resetSubscribeForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe a guest</DialogTitle>
            <DialogDescription>Record that they paid at the desk, and set when to collect next.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              subscribeMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={subscribePlanId || undefined} onValueChange={setSubscribePlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} · {formatCurrency(plan.priceCents)} / {intervalLabel(plan.interval).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Guest</Label>
              <Select value={subscribeCustomerId || undefined} onValueChange={setSubscribeCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Who is joining?" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next-bill">Next bill date</Label>
              <Input
                id="next-bill"
                type="date"
                value={nextBillOn}
                onChange={(event) => setNextBillOn(event.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubscribeOpen(false)}>
                Cancel
              </Button>
              <TrialLockedControl locked={trialLocked}>
                <Button
                  type="submit"
                  disabled={trialLocked || subscribeMutation.isPending || !subscribePlanId || !subscribeCustomerId}
                >
                  {subscribeMutation.isPending ? 'Saving…' : 'Start membership'}
                </Button>
              </TrialLockedControl>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this membership?</DialogTitle>
            <DialogDescription>
              {cancelTarget
                ? `${personName(customersById[cancelTarget.customerId])} will no longer be billed for ${plansById[cancelTarget.planId]?.name ?? 'this plan'}.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelTarget(null)}>
              Keep it
            </Button>
            <TrialLockedControl locked={trialLocked}>
              <Button
                variant="destructive"
                disabled={trialLocked || updateMembershipMutation.isPending || !cancelTarget}
                onClick={() =>
                  cancelTarget &&
                  updateMembershipMutation.mutate({ membershipId: cancelTarget.id, status: 'cancelled' })
                }
              >
                {updateMembershipMutation.isPending ? 'Cancelling…' : 'Cancel membership'}
              </Button>
            </TrialLockedControl>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MembershipActions({
  membership,
  trialLocked,
  busy,
  compact,
  onBill,
  onPause,
  onCancel,
}: {
  membership: CustomerMembership;
  trialLocked: boolean;
  busy: boolean;
  compact?: boolean;
  onBill: () => void;
  onPause: () => void;
  onCancel: () => void;
}) {
  if (membership.status === 'cancelled') return null;
  const width = compact ? undefined : 'w-full';
  return (
    <div className={cn('flex flex-col gap-2', compact ? 'flex-row flex-wrap justify-end' : 'sm:flex-row')}>
      {membership.status === 'active' && (
        <TrialLockedControl locked={trialLocked} className={width}>
          <Button size="sm" className={width} disabled={trialLocked || busy} onClick={onBill}>
            Record bill
          </Button>
        </TrialLockedControl>
      )}
      <TrialLockedControl locked={trialLocked} className={width}>
        <Button size="sm" variant="outline" className={width} disabled={trialLocked || busy} onClick={onPause}>
          {membership.status === 'paused' ? 'Resume' : 'Pause'}
        </Button>
      </TrialLockedControl>
      <TrialLockedControl locked={trialLocked} className={width}>
        <Button size="sm" variant="outline" className={width} disabled={trialLocked || busy} onClick={onCancel}>
          Cancel
        </Button>
      </TrialLockedControl>
    </div>
  );
}

function MembershipCard({
  membership,
  customerName,
  plan,
  trialLocked,
  busy,
  onBill,
  onPause,
  onCancel,
}: {
  membership: CustomerMembership;
  customerName: string;
  plan: MembershipPlan | undefined;
  trialLocked: boolean;
  busy: boolean;
  onBill: () => void;
  onPause: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3 border-b border-stone-100 p-4 last:border-b-0 dark:border-stone-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{customerName}</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{plan?.name ?? 'Plan'}</p>
          <p className="mt-1 text-sm text-stone-500">Next bill {formatDate(membership.nextBillOn)}</p>
        </div>
        <Badge variant={statusVariant(membership.status)} className="shrink-0">
          {statusLabel(membership.status)}
        </Badge>
      </div>
      <MembershipActions
        membership={membership}
        trialLocked={trialLocked}
        busy={busy}
        onBill={onBill}
        onPause={onPause}
        onCancel={onCancel}
      />
    </div>
  );
}
