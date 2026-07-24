import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { helperTextClass } from '@/components/common/Panel';
import { LoadingState } from '@/components/common/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { StaffPermissions } from '@/types/api';
import { useOrgTrialExpired } from '@/hooks/useOrgTrialExpired';
import { TRIAL_LOCKED_MESSAGE } from '@/lib/trial';

interface StaffPermissionsSectionProps {
  orgId: string;
}

const PERMISSION_ITEMS: Array<{
  key: keyof StaffPermissions;
  label: string;
  description: string;
}> = [
  {
    key: 'canManageOwnSchedule',
    label: 'Manage own schedule',
    description: 'Set and update their weekly availability hours.',
  },
  {
    key: 'canCreateAppointments',
    label: 'Create appointments',
    description: 'Book new appointments and edit their own scheduled visits.',
  },
  {
    key: 'canCancelAppointments',
    label: 'Cancel appointments',
    description: 'Cancel single visits or recurring series.',
  },
  {
    key: 'canManageVisitPayment',
    label: 'Check in, check out, and take payment',
    description: 'Update visit status, run checkout, and collect payment.',
  },
  {
    key: 'canAddCheckoutProducts',
    label: 'Add products to checkout',
    description: 'Add retail products to appointment shopping carts.',
  },
  {
    key: 'canBatchCheckout',
    label: 'Batch checkout',
    description:
      'Check out multiple arrived appointments together. Requires batch checkout to be enabled for the organization.',
  },
];

export function StaffPermissionsSection({ orgId }: StaffPermissionsSectionProps) {
  const queryClient = useQueryClient();
  const trialExpired = useOrgTrialExpired();

  const { data, isLoading } = useQuery({
    queryKey: ['staff-permissions', orgId],
    queryFn: () => orgApi.getStaffPermissions(orgId),
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<StaffPermissions>) => orgApi.updateStaffPermissions(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-permissions', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      toast.success('Staff permissions saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState />;

  const permissions = data?.staffPermissions;
  if (!permissions) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Staff permissions</CardTitle>
        <p className={helperTextClass}>
          Control what staff members can do in the salon app. Organization owners and admins always have full access.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {PERMISSION_ITEMS.map((item) => (
          <PermissionRow
            key={item.key}
            label={item.label}
            description={item.description}
            checked={permissions[item.key]}
            disabled={updateMutation.isPending || trialExpired}
            title={trialExpired ? TRIAL_LOCKED_MESSAGE : undefined}
            onCheckedChange={(checked) => updateMutation.mutate({ [item.key]: checked })}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function PermissionRow({
  label,
  description,
  checked,
  disabled,
  title,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  title?: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4" title={title}>
      <div className="min-w-0 space-y-1">
        <Label>{label}</Label>
        <p className={helperTextClass}>{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}
