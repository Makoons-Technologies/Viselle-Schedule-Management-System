import { useMutation } from '@tanstack/react-query';
import { LogOut, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { orgApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OrgDangerZoneProps {
  orgId: string;
  orgName?: string;
}

function homePathForUser(role: string | undefined, organizationId: string) {
  return role === 'org_owner' ? `/orgs/${organizationId}/dashboard` : `/orgs/${organizationId}/calendar`;
}

/**
 * Danger zone for tenant users:
 * - org_owner of this org → Delete organization (typed "Delete Org")
 * - staff / member → Leave organization (typed "Leave Org")
 */
export function OrgDangerZone({ orgId, orgName }: OrgDangerZoneProps) {
  const navigate = useNavigate();
  const { user, memberships, leaveOrganization, applyLeaveOrDeleteResult } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const membership = memberships.find((m) => m.organizationId === orgId);
  const isOwnerOfThisOrg =
    user?.role === 'org_owner' &&
    (membership?.accountRole === 'org_owner' ||
      (!membership && user.organizationId === orgId));

  const leaveMutation = useMutation({
    mutationFn: () => leaveOrganization(orgId),
    onSuccess: (result) => {
      setConfirmOpen(false);
      if (result.outcome === 'logged_out') {
        toast.success('You left the organization');
        navigate('/login');
        return;
      }
      toast.success('You left the organization');
      const nextOrgId = result.user.organizationId;
      if (nextOrgId) {
        navigate(homePathForUser(result.user.role, nextOrgId));
      } else {
        navigate('/login');
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => orgApi.deleteOrganization(orgId),
    onSuccess: (result) => {
      applyLeaveOrDeleteResult(result);
      setConfirmOpen(false);
      if (result.outcome === 'logged_out') {
        toast.success('Organization deleted');
        navigate('/login');
        return;
      }
      toast.success('Organization deleted');
      const nextOrgId = result.user.organizationId;
      if (nextOrgId) {
        navigate(homePathForUser(result.user.role, nextOrgId));
      } else {
        navigate('/login');
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (user?.role === 'platform_owner') return null;

  const label = orgName ? `"${orgName}"` : 'this organization';
  const pending = leaveMutation.isPending || deleteMutation.isPending;

  if (isOwnerOfThisOrg) {
    return (
      <>
        <Card className="border-red-200 dark:border-red-900/60">
          <CardHeader>
            <CardTitle className="text-base text-red-700 dark:text-red-400">Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Delete {label}. Public booking turns off and the organization is cancelled. This cannot be
              undone from the app.
            </p>
            <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete organization
            </Button>
          </CardContent>
        </Card>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete organization?"
          description={`Permanently cancel ${label}? Staff lose access and public booking is disabled.`}
          confirmLabel="Delete organization"
          confirmPhrase="Delete Org"
          destructive
          loading={pending}
          onConfirm={() => deleteMutation.mutate()}
        />
      </>
    );
  }

  return (
    <>
      <Card className="border-red-200 dark:border-red-900/60">
        <CardHeader>
          <CardTitle className="text-base text-red-700 dark:text-red-400">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Leave {label}. You will lose access unless you are invited again.
          </p>
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
            <LogOut className="h-4 w-4" />
            Leave organization
          </Button>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Leave organization?"
        description={`Leave ${label}? You will need a new invite to return.`}
        confirmLabel="Leave organization"
        confirmPhrase="Leave Org"
        destructive
        loading={pending}
        onConfirm={() => leaveMutation.mutate()}
      />
    </>
  );
}
