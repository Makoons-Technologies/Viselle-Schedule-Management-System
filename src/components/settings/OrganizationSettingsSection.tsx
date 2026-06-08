import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { orgApi, ownerApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { OrganizationStatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface OrganizationSettingsSectionProps {
  orgId: string;
}

export function OrganizationSettingsSection({ orgId }: OrganizationSettingsSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isPlatformOwner = user?.role === 'platform_owner';

  const { data, isLoading } = useQuery({
    queryKey: ['organization', orgId, user?.role],
    queryFn: () =>
      isPlatformOwner ? ownerApi.getOrganization(orgId) : orgApi.getOrganization(orgId),
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { name?: string; publicBookingEnabled?: boolean }) =>
      isPlatformOwner
        ? ownerApi.updateOrganization(orgId, payload)
        : orgApi.updateOrganization(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'organizations'] });
      queryClient.invalidateQueries({ queryKey: ['website', orgId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState />;

  const org = data?.organization;
  if (!org) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Status</Label>
          <div className="mt-1"><OrganizationStatusBadge status={org.status} /></div>
        </div>
        <div>
          <Label>Business name</Label>
          <Input
            defaultValue={org.name}
            onBlur={(e) => {
              if (e.target.value !== org.name) {
                updateMutation.mutate({ name: e.target.value });
              }
            }}
          />
        </div>
        <div>
          <Label>Public booking slug</Label>
          <Input value={org.slug} disabled />
          <p className="mt-1 text-xs text-stone-500">Contact platform support to change your booking URL slug.</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Public booking enabled</Label>
            <p className="text-xs text-stone-500">
              Allow customers to book online. Also controls hosted subdomain sites and external API access.
            </p>
          </div>
          <Switch
            checked={org.publicBookingEnabled}
            onCheckedChange={(v) => updateMutation.mutate({ publicBookingEnabled: v })}
          />
        </div>
        {updateMutation.isPending && <p className="text-xs text-stone-500">Saving…</p>}
      </CardContent>
    </Card>
  );
}
