import { useQuery } from '@tanstack/react-query';
import { orgApi } from '@/lib/api';
import { useOrgId } from '@/hooks/useOrgId';
import { LoadingState } from '@/components/common/LoadingState';
import { DEFAULT_HOMEPAGE_BLOCKS, HomepageBlocks } from '@/components/dashboard/HomepageBlocks';
import { useAuth } from '@/context/AuthContext';

export function OrgDashboard() {
  const orgId = useOrgId();
  const { user } = useAuth();

  const { data: appointments, isLoading: loadingAppts } = useQuery({
    queryKey: ['appointments', orgId],
    queryFn: () => orgApi.listAppointments(orgId),
    enabled: !!orgId,
  });

  const { data: staff } = useQuery({
    queryKey: ['accounts', orgId],
    queryFn: () => orgApi.listAccounts(orgId),
    enabled: !!orgId,
  });

  const { data: services } = useQuery({
    queryKey: ['services', orgId],
    queryFn: () => orgApi.listServices(orgId),
    enabled: !!orgId,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId,
  });

  const { data: layout } = useQuery({
    queryKey: ['homepage-layout', orgId],
    queryFn: () => orgApi.getHomepageLayout(orgId),
    enabled: !!orgId,
  });

  if (loadingAppts) return <LoadingState />;

  const upcoming = (appointments?.appointments ?? []).filter(
    (appointment) => appointment.visitStatus !== 'cancelled' && new Date(appointment.startTime) > new Date(),
  );
  return (
    <div>
      {orgId ? (
        <HomepageBlocks
          orgId={orgId}
          blocks={layout?.blocks?.length ? layout.blocks : DEFAULT_HOMEPAGE_BLOCKS}
          showSetup={user?.role === 'org_owner'}
          stats={{
            upcoming: upcoming.length,
            staff: staff?.accounts.length ?? 0,
            services: services?.services.length ?? 0,
            customers: customers?.customers.length ?? 0,
          }}
          services={services?.services ?? []}
          upcomingAppointments={upcoming}
        />
      ) : null}
    </div>
  );
}
