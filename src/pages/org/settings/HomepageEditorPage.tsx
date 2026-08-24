import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { blocksToSchema, schemaToBlocks } from '@/components/builder/schemaTree';
import { DesktopOnlyGate } from '@/components/common/DesktopOnlyGate';
import { DEFAULT_HOMEPAGE_BLOCKS, HomepageBlocks } from '@/components/dashboard/HomepageBlocks';
import { FormioBuilder } from '@/components/forms/FormioBuilder';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import type { FormioSchema } from '@/types/api';

export function HomepageEditorPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const locked = useOrgWriteLocked();
  const [schema, setSchema] = useState<FormioSchema>(() => blocksToSchema(DEFAULT_HOMEPAGE_BLOCKS));

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
  const formsQuery = useQuery({
    queryKey: ['forms', orgId],
    queryFn: () => orgApi.listForms(orgId),
    enabled: !!orgId,
  });

  useEffect(() => {
    if (layoutQuery.data?.blocks?.length) setSchema(blocksToSchema(layoutQuery.data.blocks));
  }, [layoutQuery.data]);

  const blocks = useMemo(() => schemaToBlocks(schema), [schema]);

  const save = useMutation({
    mutationFn: () => orgApi.saveHomepageLayout(orgId, blocks),
    onSuccess: (data) => {
      setSchema(blocksToSchema(data.blocks));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Drag cards and layout blocks onto the canvas. The live preview on the right is sized like a phone, so columns stack the same way they will on the dashboard.
        </p>
        <TrialLockedControl locked={locked}>
          <Button type="button" className="w-full sm:w-auto" disabled={locked || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Save homepage'}
          </Button>
        </TrialLockedControl>
      </div>
      <DesktopOnlyGate
        title="Homepage editor needs a bigger screen"
        description="Drag-and-drop layout is easier with a mouse and a wide canvas. The dashboard itself still works on phones."
      >
        <div className="grid min-w-0 items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <FormioBuilder
            schema={schema}
            onChange={setSchema}
            mode="homepage"
            orgId={orgId}
            forms={formsQuery.data?.forms ?? []}
            services={servicesQuery.data?.services ?? []}
          />
          <div className="min-w-0 overflow-hidden rounded-2xl border border-dashed border-stone-300 p-4 dark:border-stone-700">
            <p className="mb-4 text-sm font-medium text-stone-500">Phone preview</p>
            <div className="mx-auto w-full max-w-sm overflow-hidden">
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
        </div>
      </DesktopOnlyGate>
    </div>
  );
}
