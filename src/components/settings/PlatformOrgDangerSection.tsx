import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ownerApi } from '@/lib/api';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlatformOrgDangerSectionProps {
  orgId: string;
}

/** Platform-only admin controls: deactivate / soft-cancel the organization. */
export function PlatformOrgDangerSection({ orgId }: PlatformOrgDangerSectionProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['organization', orgId, 'platform_owner'],
    queryFn: () => ownerApi.getOrganization(orgId),
    enabled: !!orgId,
  });

  const deactivateMutation = useMutation({
    mutationFn: () => ownerApi.deactivateOrganization(orgId),
    onSuccess: () => {
      toast.success('Organization deactivated');
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'organizations'] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'stats'] });
      setConfirmOpen(false);
      navigate('/platform/organizations');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState />;

  const org = data?.organization;
  if (!org) return null;

  const canDeactivate = org.status === 'active' || org.status === 'trial';

  return (
    <>
      <Card className="border-red-200 dark:border-red-900/60">
        <CardHeader>
          <CardTitle className="text-base text-red-700 dark:text-red-400">Admin controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Deactivating locks staff and owners out and turns off public booking. Billing can be set
            to cancelled in the Billing section above.
          </p>
          <Button
            variant="destructive"
            size="sm"
            disabled={!canDeactivate}
            onClick={() => setConfirmOpen(true)}
          >
            <Ban className="h-4 w-4" />
            {canDeactivate ? 'Deactivate organization' : 'Already inactive'}
          </Button>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Deactivate organization?"
        description={`Deactivate ${org.name}? Staff and owners will lose access, and public booking will be disabled.`}
        confirmLabel="Deactivate"
        destructive
        loading={deactivateMutation.isPending}
        onConfirm={() => deactivateMutation.mutate()}
      />
    </>
  );
}
