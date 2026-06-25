import { useQuery } from '@tanstack/react-query';
import { orgApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AvailabilityWeekCalendar } from '@/components/availability/AvailabilityWeekCalendar';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';

export function StaffAvailabilityPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? '';
  const accountId = user?.accountId ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['availability-rules', orgId, accountId],
    queryFn: () => orgApi.listAvailabilityRules(orgId, accountId),
    enabled: !!orgId && !!accountId,
  });

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="My Availability" description="Your weekly bookable hours" />
      <AvailabilityWeekCalendar rules={data?.availabilityRules ?? []} readOnly />
    </div>
  );
}
