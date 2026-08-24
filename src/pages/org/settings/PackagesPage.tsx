import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ticket } from 'lucide-react';
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
import { CENTS_PER_CREDIT, creditValueHint, formatCredits, packageCreditCents, remainingPackageCreditCents } from '@/lib/credits';
import { cn, formatCurrency } from '@/lib/utils';
import type { Customer, CustomerPackage, Service, ServicePackage } from '@/types/api';

const NONE = 'none';

function centsFromDollars(dollars: string): number {
  return Math.round(Number(dollars) * 100);
}

function personName(customer: Customer | undefined): string {
  if (!customer) return 'Unknown guest';
  return `${customer.firstName} ${customer.lastName}`.trim();
}

export function PackagesPage() {
  const orgId = useOrgId();
  const trialLocked = useOrgWriteLocked();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [sellTarget, setSellTarget] = useState<ServicePackage | null>(null);
  const [sellCustomerId, setSellCustomerId] = useState('');
  const [useTarget, setUseTarget] = useState<CustomerPackage | null>(null);
  const [useAmount, setUseAmount] = useState('');
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState(NONE);
  const [credits, setCredits] = useState('100');
  const [price, setPrice] = useState('50');

  const packagesQuery = useQuery({
    queryKey: ['packages', orgId],
    queryFn: () => orgApi.listPackages(orgId),
    enabled: !!orgId,
  });
  const soldQuery = useQuery({
    queryKey: ['customer-packages', orgId],
    queryFn: () => orgApi.listCustomerPackages(orgId),
    enabled: !!orgId,
  });
  const customersQuery = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId,
  });
  const servicesQuery = useQuery({
    queryKey: ['services', orgId],
    queryFn: () => orgApi.listServices(orgId),
    enabled: !!orgId,
  });

  const packages = packagesQuery.data?.packages ?? [];
  const soldPacks = soldQuery.data?.customerPackages ?? [];
  const customers = customersQuery.data?.customers ?? [];
  const services = servicesQuery.data?.services ?? [];

  const customersById = useMemo(
    () => Object.fromEntries((customersQuery.data?.customers ?? []).map((customer) => [customer.id, customer] as const)),
    [customersQuery.data?.customers],
  );
  const servicesById = useMemo(
    () => Object.fromEntries((servicesQuery.data?.services ?? []).map((service) => [service.id, service] as const)),
    [servicesQuery.data?.services],
  );
  const packagesById = useMemo(
    () => Object.fromEntries((packagesQuery.data?.packages ?? []).map((pack) => [pack.id, pack] as const)),
    [packagesQuery.data?.packages],
  );

  const resetCreate = () => {
    setName('');
    setServiceId(NONE);
    setCredits('100');
    setPrice('50');
  };

  const createHint = creditValueHint(centsFromDollars(credits), centsFromDollars(price));

  const createMutation = useMutation({
    mutationFn: () => {
      const creditCents = centsFromDollars(credits);
      const priceCents = centsFromDollars(price);
      if (!name.trim()) throw new Error('Give this pack a name');
      if (!Number.isInteger(creditCents) || creditCents < CENTS_PER_CREDIT) {
        throw new Error('Enter at least 1 credit');
      }
      if (!Number.isFinite(priceCents) || priceCents < 0) throw new Error('Enter a price');
      return orgApi.createPackage(orgId, {
        name: name.trim(),
        serviceId: serviceId === NONE ? undefined : serviceId,
        creditCents,
        priceCents,
      });
    },
    onSuccess: () => {
      toast.success('Package is ready to sell');
      resetCreate();
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['packages', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not create this package')),
  });

  const deactivateMutation = useMutation({
    mutationFn: (packageId: string) => orgApi.updatePackage(orgId, packageId, { isActive: false }),
    onSuccess: () => {
      toast.success('Package taken off the menu');
      void queryClient.invalidateQueries({ queryKey: ['packages', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not update this package')),
  });

  const sellMutation = useMutation({
    mutationFn: () => {
      if (!sellTarget) throw new Error('Pick a package');
      if (!sellCustomerId) throw new Error('Pick a guest');
      return orgApi.sellPackage(orgId, { packageId: sellTarget.id, customerId: sellCustomerId });
    },
    onSuccess: () => {
      toast.success('Pack sold');
      setSellTarget(null);
      setSellCustomerId('');
      void queryClient.invalidateQueries({ queryKey: ['customer-packages', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not sell this pack')),
  });

  const useCreditsMutation = useMutation({
    mutationFn: () => {
      if (!useTarget) throw new Error('Pick a pack');
      const amountCents = centsFromDollars(useAmount);
      if (!Number.isFinite(amountCents) || amountCents < 1) throw new Error('Enter how many credits to use');
      return orgApi.usePackageCredits(orgId, useTarget.id, { amountCents });
    },
    onSuccess: ({ customerPackage }) => {
      const left = remainingPackageCreditCents(customerPackage);
      toast.success(left > 0 ? `${formatCredits(left)} left` : 'Last credits used — pack is finished');
      setUseTarget(null);
      setUseAmount('');
      void queryClient.invalidateQueries({ queryKey: ['customer-packages', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not use credits')),
  });

  const openUseCredits = (sold: CustomerPackage) => {
    const pack = packagesById[sold.packageId];
    const service = pack?.serviceId ? servicesById[pack.serviceId] : undefined;
    const remaining = remainingPackageCreditCents(sold);
    const suggested = service?.priceCents && service.priceCents <= remaining ? service.priceCents : remaining;
    setUseAmount((suggested / CENTS_PER_CREDIT).toString());
    setUseTarget(sold);
  };

  if (packagesQuery.isLoading || soldQuery.isLoading) return <LoadingState />;

  const activePackages = packages.filter((pack) => pack.isActive);

  return (
    <div className="space-y-8">
      <p className={cn('-mt-2', sectionMutedClass)}>
        Credit packs. 1 credit = $1 toward a visit — sell 100 credits for $50, then burn what the service costs.
      </p>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium text-stone-900 dark:text-stone-100">On the menu</h2>
          <TrialLockedControl locked={trialLocked}>
            <Button
              disabled={trialLocked}
              onClick={() => {
                resetCreate();
                setCreateOpen(true);
              }}
            >
              New package
            </Button>
          </TrialLockedControl>
        </div>

        {packages.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No packages yet"
            description="Create a pack like “100 credits for $50” and sell it at the desk."
            action={
              <TrialLockedControl locked={trialLocked}>
                <Button disabled={trialLocked} onClick={() => setCreateOpen(true)}>
                  New package
                </Button>
              </TrialLockedControl>
            }
          />
        ) : (
          <Panel className="overflow-hidden">
            <div className="desktop-shell:hidden">
              {packages.map((pack) => (
                <PackageCard
                  key={pack.id}
                  pack={pack}
                  service={pack.serviceId ? servicesById[pack.serviceId] : undefined}
                  trialLocked={trialLocked}
                  deactivating={deactivateMutation.isPending}
                  onSell={() => {
                    setSellCustomerId('');
                    setSellTarget(pack);
                  }}
                  onDeactivate={() => deactivateMutation.mutate(pack.id)}
                />
              ))}
            </div>
            <div className="hidden desktop-shell:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pack) => (
                    <TableRow key={pack.id}>
                      <TableCell className="font-medium">{pack.name}</TableCell>
                      <TableCell className="text-stone-500">
                        {pack.serviceId ? (servicesById[pack.serviceId]?.name ?? 'Service') : 'Any service'}
                      </TableCell>
                      <TableCell>{formatCredits(packageCreditCents(pack))}</TableCell>
                      <TableCell>{formatCurrency(pack.priceCents)}</TableCell>
                      <TableCell>
                        <Badge variant={pack.isActive ? 'success' : 'secondary'}>
                          {pack.isActive ? 'On the menu' : 'Off the menu'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {pack.isActive && (
                            <TrialLockedControl locked={trialLocked}>
                              <Button
                                size="sm"
                                disabled={trialLocked}
                                onClick={() => {
                                  setSellCustomerId('');
                                  setSellTarget(pack);
                                }}
                              >
                                Sell
                              </Button>
                            </TrialLockedControl>
                          )}
                          {pack.isActive && (
                            <TrialLockedControl locked={trialLocked}>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={trialLocked || deactivateMutation.isPending}
                                onClick={() => deactivateMutation.mutate(pack.id)}
                              >
                                Deactivate
                              </Button>
                            </TrialLockedControl>
                          )}
                        </div>
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
        <h2 className="text-sm font-medium text-stone-900 dark:text-stone-100">Sold packs</h2>
        {soldPacks.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No packs sold yet"
            description={
              activePackages.length === 0
                ? 'Create a package first, then sell it to a guest.'
                : 'Sell a pack to a guest, then use credits when they come in.'
            }
          />
        ) : (
          <Panel className="overflow-hidden">
            <div className="desktop-shell:hidden">
              {soldPacks.map((sold) => (
                <SoldPackCard
                  key={sold.id}
                  sold={sold}
                  packName={packagesById[sold.packageId]?.name ?? 'Package'}
                  customerName={personName(customersById[sold.customerId])}
                  trialLocked={trialLocked}
                  using={useCreditsMutation.isPending}
                  onUse={() => openUseCredits(sold)}
                />
              ))}
            </div>
            <div className="hidden desktop-shell:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Credits left</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {soldPacks.map((sold) => (
                    <TableRow key={sold.id}>
                      <TableCell className="font-medium">{personName(customersById[sold.customerId])}</TableCell>
                      <TableCell>{packagesById[sold.packageId]?.name ?? 'Package'}</TableCell>
                      <TableCell>{formatCredits(remainingPackageCreditCents(sold))}</TableCell>
                      <TableCell>
                        <Badge variant={sold.status === 'active' ? 'success' : 'secondary'}>
                          {sold.status === 'used' ? 'Used up' : sold.status === 'void' ? 'Voided' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {sold.status === 'active' && remainingPackageCreditCents(sold) > 0 && (
                          <TrialLockedControl locked={trialLocked}>
                            <Button
                              size="sm"
                              disabled={trialLocked || useCreditsMutation.isPending}
                              onClick={() => openUseCredits(sold)}
                            >
                              Use credits
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

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreate();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New package</DialogTitle>
            <DialogDescription>
              Guests pay once and get credits. 1 credit = $1 toward a visit.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="package-name">Name</Label>
              <Input
                id="package-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="100 credits"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Service (optional)</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Any service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Any service</SelectItem>
                  {services
                    .filter((service) => service.isActive)
                    .map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="package-credits">Credits in the pack</Label>
                <Input
                  id="package-credits"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={credits}
                  onChange={(event) => setCredits(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="package-price">Price ($)</Label>
                <Input
                  id="package-price"
                  type="number"
                  min={0}
                  step={0.01}
                  inputMode="decimal"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                />
              </div>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400">{createHint}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <TrialLockedControl locked={trialLocked}>
                <Button type="submit" disabled={trialLocked || createMutation.isPending}>
                  {createMutation.isPending ? 'Saving…' : 'Create package'}
                </Button>
              </TrialLockedControl>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!sellTarget}
        onOpenChange={(open) => {
          if (!open) {
            setSellTarget(null);
            setSellCustomerId('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell {sellTarget?.name ?? 'this pack'}</DialogTitle>
            <DialogDescription>
              {sellTarget
                ? `${formatCredits(packageCreditCents(sellTarget))} for ${formatCurrency(sellTarget.priceCents)}. Collect payment at the desk.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              sellMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label>Guest</Label>
              <Select value={sellCustomerId || undefined} onValueChange={setSellCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Who is this for?" />
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSellTarget(null)}>
                Cancel
              </Button>
              <TrialLockedControl locked={trialLocked}>
                <Button type="submit" disabled={trialLocked || sellMutation.isPending || !sellCustomerId}>
                  {sellMutation.isPending ? 'Selling…' : 'Sell pack'}
                </Button>
              </TrialLockedControl>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!useTarget}
        onOpenChange={(open) => {
          if (!open) {
            setUseTarget(null);
            setUseAmount('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use credits</DialogTitle>
            <DialogDescription>
              {useTarget
                ? `${formatCredits(remainingPackageCreditCents(useTarget))} left. 1 credit = $1 — enter the service price.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              useCreditsMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="use-credits">Credits to use</Label>
              <Input
                id="use-credits"
                type="number"
                min={0.01}
                step={0.01}
                inputMode="decimal"
                value={useAmount}
                onChange={(event) => setUseAmount(event.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUseTarget(null)}>
                Cancel
              </Button>
              <TrialLockedControl locked={trialLocked}>
                <Button type="submit" disabled={trialLocked || useCreditsMutation.isPending}>
                  {useCreditsMutation.isPending ? 'Using…' : 'Use credits'}
                </Button>
              </TrialLockedControl>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackageCard({
  pack,
  service,
  trialLocked,
  deactivating,
  onSell,
  onDeactivate,
}: {
  pack: ServicePackage;
  service: Service | undefined;
  trialLocked: boolean;
  deactivating: boolean;
  onSell: () => void;
  onDeactivate: () => void;
}) {
  return (
    <div className="space-y-3 border-b border-stone-100 p-4 last:border-b-0 dark:border-stone-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{pack.name}</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            {formatCredits(packageCreditCents(pack))} · {formatCurrency(pack.priceCents)}
          </p>
          <p className="mt-1 text-sm text-stone-500">{service?.name ?? 'Any service'}</p>
        </div>
        <Badge variant={pack.isActive ? 'success' : 'secondary'} className="shrink-0">
          {pack.isActive ? 'On the menu' : 'Off the menu'}
        </Badge>
      </div>
      {pack.isActive && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <TrialLockedControl locked={trialLocked} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" disabled={trialLocked} onClick={onSell}>
              Sell
            </Button>
          </TrialLockedControl>
          <TrialLockedControl locked={trialLocked} className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={trialLocked || deactivating}
              onClick={onDeactivate}
            >
              Deactivate
            </Button>
          </TrialLockedControl>
        </div>
      )}
    </div>
  );
}

function SoldPackCard({
  sold,
  packName,
  customerName,
  trialLocked,
  using,
  onUse,
}: {
  sold: CustomerPackage;
  packName: string;
  customerName: string;
  trialLocked: boolean;
  using: boolean;
  onUse: () => void;
}) {
  const remaining = remainingPackageCreditCents(sold);
  return (
    <div className="space-y-3 border-b border-stone-100 p-4 last:border-b-0 dark:border-stone-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{customerName}</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{packName}</p>
          <p className="mt-1 text-sm text-stone-500">{formatCredits(remaining)} left</p>
        </div>
        <Badge variant={sold.status === 'active' ? 'success' : 'secondary'} className="shrink-0">
          {sold.status === 'used' ? 'Used up' : sold.status === 'void' ? 'Voided' : 'Active'}
        </Badge>
      </div>
      {sold.status === 'active' && remaining > 0 && (
        <TrialLockedControl locked={trialLocked}>
          <Button className="w-full" disabled={trialLocked || using} onClick={onUse}>
            Use credits
          </Button>
        </TrialLockedControl>
      )}
    </div>
  );
}
