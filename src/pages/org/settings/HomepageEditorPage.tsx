import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DesktopOnlyGate } from '@/components/common/DesktopOnlyGate';
import { DEFAULT_HOMEPAGE_BLOCKS, HomepageBlocks } from '@/components/dashboard/HomepageBlocks';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import type { HomepageBlock } from '@/types/api';

const LABELS: Record<HomepageBlock['type'], string> = {
  welcome: 'Welcome message',
  announcement: 'Announcement',
  stats: 'Today’s numbers',
  setup: 'Setup checklist',
  bookingCta: 'Booking link',
  featuredServices: 'Featured services',
  upcoming: 'Upcoming appointments',
  revenue: 'Revenue',
};

export function HomepageEditorPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const locked = useOrgWriteLocked();
  const [blocks, setBlocks] = useState<HomepageBlock[]>(DEFAULT_HOMEPAGE_BLOCKS);

  const layoutQuery = useQuery({
    queryKey: ['homepage-layout', orgId],
    queryFn: () => orgApi.getHomepageLayout(orgId),
    enabled: !!orgId,
  });
  const appointmentsQuery = useQuery({
    queryKey: ['appointments', orgId],
    queryFn: () => orgApi.listAppointments(orgId),
    enabled: !!orgId,
  });
  const staffQuery = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId,
  });
  const servicesQuery = useQuery({
    queryKey: ['services', orgId],
    queryFn: () => orgApi.listServices(orgId),
    enabled: !!orgId,
  });
  const customersQuery = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId,
  });

  useEffect(() => {
    if (layoutQuery.data?.blocks?.length) setBlocks(layoutQuery.data.blocks);
  }, [layoutQuery.data]);

  const save = useMutation({
    mutationFn: () => orgApi.saveHomepageLayout(orgId, blocks),
    onSuccess: (data) => {
      setBlocks(data.blocks);
      toast.success('Homepage saved');
      void queryClient.invalidateQueries({ queryKey: ['homepage-layout', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save homepage')),
  });

  const upcoming = useMemo(
    () =>
      (appointmentsQuery.data?.appointments ?? []).filter(
        (appointment) => appointment.visitStatus !== 'cancelled' && new Date(appointment.startTime) > new Date(),
      ),
    [appointmentsQuery.data],
  );

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= blocks.length) return;
    const copy = [...blocks];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    setBlocks(copy);
  };

  const update = (id: string, patch: Partial<HomepageBlock>) => {
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Choose what your team sees after they sign in. Use the arrows to reorder cards.
      </p>
      <div className="flex justify-end">
        <TrialLockedControl locked={locked}>
          <Button type="button" disabled={locked || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Save homepage'}
          </Button>
        </TrialLockedControl>
      </div>
      <DesktopOnlyGate
        title="Homepage editor needs a bigger screen"
        description="Rearranging dashboard cards is easier with a mouse and a wide layout."
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-3">
            {blocks.map((block, index) => (
              <div key={block.id} className="rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{LABELS[block.type]}</p>
                    <p className="text-xs text-stone-500">{block.visible ? 'Showing on dashboard' : 'Hidden'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="icon" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => move(index, 1)}
                      disabled={index === blocks.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Switch checked={block.visible} onCheckedChange={(visible) => update(block.id, { visible })} />
                  </div>
                </div>
                {block.type === 'welcome' || block.type === 'announcement' || block.type === 'bookingCta' ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label>Title</Label>
                      <Input value={block.title ?? ''} onChange={(event) => update(block.id, { title: event.target.value })} />
                    </div>
                    <div>
                      <Label>Message</Label>
                      <Textarea value={block.body ?? ''} onChange={(event) => update(block.id, { body: event.target.value })} />
                    </div>
                  </div>
                ) : null}
                {block.type === 'featuredServices' ? (
                  <div className="mt-3 grid gap-2">
                    {(servicesQuery.data?.services ?? []).map((service) => {
                      const selected = (block.serviceIds ?? []).includes(service.id);
                      return (
                        <label key={service.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              const current = block.serviceIds ?? [];
                              update(block.id, {
                                serviceIds: selected ? current.filter((id) => id !== service.id) : [...current, service.id],
                              });
                            }}
                          />
                          {service.name}
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-dashed border-stone-300 p-4 dark:border-stone-700">
            <p className="mb-4 text-sm font-medium text-stone-500">Preview</p>
            <HomepageBlocks
              orgId={orgId}
              blocks={blocks}
              showSetup={user?.role === 'org_owner'}
              canEdit={false}
              stats={{
                upcoming: upcoming.length,
                staff: staffQuery.data?.accounts.length ?? 0,
                services: servicesQuery.data?.services.length ?? 0,
                customers: customersQuery.data?.customers.length ?? 0,
              }}
              services={servicesQuery.data?.services ?? []}
              upcomingAppointments={upcoming}
            />
          </div>
        </div>
      </DesktopOnlyGate>
    </div>
  );
}
