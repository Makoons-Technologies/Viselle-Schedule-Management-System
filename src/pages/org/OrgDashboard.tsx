import { useQuery } from '@tanstack/react-query';
import { DoorOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalkInDialog } from '@/components/appointments/WalkInDialog';
import { LoadingState } from '@/components/common/LoadingState';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { DEFAULT_HOMEPAGE_BLOCKS, HomepageBlocks } from '@/components/dashboard/HomepageBlocks';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { calendarAppointmentHref } from '@/lib/calendar-appointment-href';
import { orgApi } from '@/lib/api';

export function OrgDashboard() {
  const orgId = useOrgId();
  const navigate = useNavigate();
  const { user, memberships } = useAuth();
  const { permissions } = useStaffPermissions(orgId);
  const trialExpired = useOrgWriteLocked();
  const [walkInOpen, setWalkInOpen] = useState(false);

  const myAccountId = useMemo(() => {
    if (user?.accountId) return user.accountId;
    return memberships.find((membership) => membership.organizationId === orgId)?.accountId ?? null;
  }, [user?.accountId, memberships, orgId]);

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
      {orgId && permissions.canCreateAppointments ? (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-50">Guest just walked in?</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Book them for right now — service, staff, and customer.
            </p>
          </div>
          <TrialLockedControl locked={trialExpired}>
            <Button disabled={trialExpired} onClick={() => setWalkInOpen(true)}>
              <DoorOpen className="h-4 w-4" />
              Take a walk-in
            </Button>
          </TrialLockedControl>
        </div>
      ) : null}
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
      {orgId ? (
        <WalkInDialog
          orgId={orgId}
          open={walkInOpen}
          onOpenChange={setWalkInOpen}
          defaultAccountId={myAccountId}
          onCreated={(created) => {
            const appointment = created[0];
            if (appointment) {
              navigate(calendarAppointmentHref(orgId, appointment));
            }
          }}
        />
      ) : null}
    </div>
  );
}
