import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import type { OrgForm, OrgFormStatus } from '@/types/api';

const STATUS_LABEL: Record<OrgFormStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

export function FormsPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const locked = useOrgWriteLocked();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canEdit = user?.role === 'org_owner' || user?.role === 'platform_owner';
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<OrgForm | null>(null);

  const formsQuery = useQuery({
    queryKey: ['forms', orgId],
    queryFn: () => orgApi.listForms(orgId),
    enabled: !!orgId,
  });

  const create = useMutation({
    mutationFn: () => orgApi.createForm(orgId, { name: name.trim(), schema: { display: 'form', components: [] } }),
    onSuccess: ({ form }) => {
      toast.success('Form created — add fields on a computer');
      setCreateOpen(false);
      setName('');
      void queryClient.invalidateQueries({ queryKey: ['forms', orgId] });
      navigate(`/orgs/${orgId}/forms/${form.id}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not create form')),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrgFormStatus }) => orgApi.updateForm(orgId, id, { status }),
    onSuccess: (_, { status }) => {
      toast.success(status === 'published' ? 'Form published' : 'Form unpublished');
      void queryClient.invalidateQueries({ queryKey: ['forms', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not update form')),
  });

  const remove = useMutation({
    mutationFn: (formId: string) => orgApi.deleteForm(orgId, formId),
    onSuccess: () => {
      toast.success('Form deleted');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['forms', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not delete form')),
  });

  if (formsQuery.isLoading) return <LoadingState />;
  const forms = formsQuery.data?.forms ?? [];

  return (
    <div>
      <PageHeader
        title="Forms"
        description="Intake, consult notes, and waivers for this salon. Build on a computer; fill on any phone."
        actions={
          canEdit ? (
            <TrialLockedControl locked={locked}>
              <Button disabled={locked} onClick={() => setCreateOpen(true)}>
                New form
              </Button>
            </TrialLockedControl>
          ) : null
        }
      />
      {forms.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No forms yet"
          description={
            canEdit
              ? 'Create a consult or waiver form, then fill it with the client.'
              : 'When the owner publishes a form, you can fill it here on any phone.'
          }
          action={
            canEdit ? (
              <TrialLockedControl locked={locked}>
                <Button disabled={locked} onClick={() => setCreateOpen(true)}>
                  New form
                </Button>
              </TrialLockedControl>
            ) : null
          }
        />
      ) : (
        <Panel className="divide-y divide-stone-100 dark:divide-stone-800">
          {forms.map((form) => (
            <div key={form.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{form.name}</p>
                <Badge
                  variant={form.status === 'published' ? 'success' : form.status === 'archived' ? 'outline' : 'secondary'}
                  className="mt-1"
                >
                  {STATUS_LABEL[form.status]}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.status === 'published' ? (
                  <Button size="sm" asChild>
                    <Link to={`/orgs/${orgId}/forms/${form.id}/fill`}>Fill out</Link>
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/orgs/${orgId}/forms/${form.id}`}>Edit on computer</Link>
                  </Button>
                ) : null}
                {canEdit && form.status !== 'published' ? (
                  <TrialLockedControl locked={locked}>
                    <Button
                      size="sm"
                      disabled={locked || updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: form.id, status: 'published' })}
                    >
                      Publish
                    </Button>
                  </TrialLockedControl>
                ) : null}
                {canEdit && form.status === 'published' ? (
                  <TrialLockedControl locked={locked}>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={locked || updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: form.id, status: 'draft' })}
                    >
                      Unpublish
                    </Button>
                  </TrialLockedControl>
                ) : null}
                {canEdit ? (
                  <TrialLockedControl locked={locked}>
                    <Button size="sm" variant="ghost" disabled={locked} onClick={() => setDeleteTarget(form)}>
                      Delete
                    </Button>
                  </TrialLockedControl>
                ) : null}
              </div>
            </div>
          ))}
        </Panel>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New form</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="form-name">Name</Label>
            <Input
              id="form-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New client consult"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this form?"
        description={
          deleteTarget
            ? `${deleteTarget.name} and its saved answers will be removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}
