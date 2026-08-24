import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
  ClipboardPen,
  Copy,
  CopyPlus,
  FileText,
  Inbox,
  Pencil,
  Search,
  Settings,
  Trash2,
  Upload,
  EyeOff,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { FormSettingsDialog } from '@/components/forms/FormSettingsDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { formIsPublic, formPrivateUrl, formPublicUrl, formVersionLabel } from '@/lib/forms';
import type { OrgForm, OrgFormStatus } from '@/types/api';

const STATUS_LABEL: Record<OrgFormStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

type StatusFilter = 'all' | OrgFormStatus;
type VisibilityFilter = 'all' | 'public' | 'private';

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function FormIconButton({
  label,
  icon: Icon,
  badge,
  variant = 'outline',
  disabled,
  onClick,
  to,
}: {
  label: string;
  icon: LucideIcon;
  badge?: number;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
  onClick?: () => void;
  to?: string;
}) {
  const button = (
    <Button
      type={to ? undefined : 'button'}
      size="icon"
      variant={variant}
      className="relative h-8 w-8"
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={onClick}
      asChild={Boolean(to)}
    >
      {to ? (
        <Link to={to}>
          <Icon className="h-4 w-4" />
          {badge != null ? (
            <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-stone-800 px-1 text-[10px] leading-4 text-white dark:bg-stone-200 dark:text-stone-900">
              {badge}
            </span>
          ) : null}
          <span className="sr-only">{label}</span>
        </Link>
      ) : (
        <>
          <Icon className="h-4 w-4" />
          {badge != null ? (
            <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-stone-800 px-1 text-[10px] leading-4 text-white dark:bg-stone-200 dark:text-stone-900">
              {badge}
            </span>
          ) : null}
          <span className="sr-only">{label}</span>
        </>
      )}
    </Button>
  );

  return (
    <span className="group relative inline-flex">
      {button}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 text-xs text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-stone-100 dark:text-stone-900">
        {label}
      </span>
    </span>
  );
}

export function FormsPage() {
  const orgId = useOrgId();
  const { user } = useAuth();
  const locked = useOrgWriteLocked();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canEdit = user?.role === 'org_owner' || user?.role === 'platform_owner';
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<OrgForm | null>(null);
  const [settingsForm, setSettingsForm] = useState<OrgForm | null>(null);

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

  const duplicate = useMutation({
    mutationFn: (formId: string) => orgApi.duplicateForm(orgId, formId),
    onSuccess: ({ form }) => {
      toast.success('Form duplicated');
      void queryClient.invalidateQueries({ queryKey: ['forms', orgId] });
      navigate(`/orgs/${orgId}/forms/${form.id}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not duplicate form')),
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

  const forms = formsQuery.data?.forms ?? [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return forms.filter((form) => {
      if (needle && !form.name.toLowerCase().includes(needle)) return false;
      if (statusFilter !== 'all' && form.status !== statusFilter) return false;
      if (visibilityFilter === 'public' && !formIsPublic(form)) return false;
      if (visibilityFilter === 'private' && formIsPublic(form)) return false;
      return true;
    });
  }, [forms, query, statusFilter, visibilityFilter]);

  if (formsQuery.isLoading) return <LoadingState />;

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
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search forms"
                className="pl-9"
              />
            </div>
            <select
              className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <select
              className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900"
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)}
            >
              <option value="all">All visibility</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-stone-500">No forms match that search.</p>
          ) : (
            <Panel className="divide-y divide-stone-100 dark:divide-stone-800">
              {filtered.map((form) => {
                const version = formVersionLabel(form);
                const publicUrl = formPublicUrl(form.shareToken);
                const canCopyPublic = formIsPublic(form) && form.status === 'published' && Boolean(publicUrl);
                return (
                  <div key={form.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{form.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge
                          variant={
                            form.status === 'published' ? 'success' : form.status === 'archived' ? 'outline' : 'secondary'
                          }
                        >
                          {STATUS_LABEL[form.status]}
                        </Badge>
                        {version ? <Badge variant="outline">{version}</Badge> : null}
                        {form.hasUnpublishedChanges ? <Badge variant="warning">Staging</Badge> : null}
                        <Badge variant="outline">{formIsPublic(form) ? 'Public' : 'Private'}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {form.status === 'published' ? (
                        <FormIconButton
                          label="Fill out"
                          icon={ClipboardPen}
                          variant="default"
                          to={`/orgs/${orgId}/forms/${form.id}/fill`}
                        />
                      ) : null}
                      {canEdit ? (
                        <FormIconButton label="Edit" icon={Pencil} to={`/orgs/${orgId}/forms/${form.id}`} />
                      ) : null}
                      {canEdit ? (
                        <FormIconButton
                          label={
                            typeof form.submissionCount === 'number'
                              ? `Answers (${form.submissionCount})`
                              : 'Answers'
                          }
                          icon={Inbox}
                          badge={form.submissionCount}
                          to={`/orgs/${orgId}/forms/${form.id}/submissions`}
                        />
                      ) : null}
                      {canEdit && form.status !== 'published' ? (
                        <TrialLockedControl locked={locked}>
                          <FormIconButton
                            label="Publish"
                            icon={Upload}
                            variant="default"
                            disabled={locked || updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ id: form.id, status: 'published' })}
                          />
                        </TrialLockedControl>
                      ) : null}
                      {canEdit && form.status === 'published' ? (
                        <TrialLockedControl locked={locked}>
                          <FormIconButton
                            label="Unpublish"
                            icon={EyeOff}
                            variant="ghost"
                            disabled={locked || updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ id: form.id, status: 'draft' })}
                          />
                        </TrialLockedControl>
                      ) : null}
                      {canEdit ? (
                        <TrialLockedControl locked={locked}>
                          <FormIconButton
                            label="Duplicate"
                            icon={CopyPlus}
                            disabled={locked || duplicate.isPending}
                            onClick={() => duplicate.mutate(form.id)}
                          />
                        </TrialLockedControl>
                      ) : null}
                      <FormIconButton
                        label={canCopyPublic ? 'Copy public link' : 'Copy private link'}
                        icon={Copy}
                        onClick={() => {
                          const url = canCopyPublic ? publicUrl : formPrivateUrl(orgId, form.id);
                          copyText(url)
                            .then(() => toast.success(canCopyPublic ? 'Public link copied' : 'Private link copied'))
                            .catch(() => toast.error('Could not copy link'));
                        }}
                      />
                      {canEdit ? (
                        <FormIconButton label="Settings" icon={Settings} onClick={() => setSettingsForm(form)} />
                      ) : null}
                      {canEdit ? (
                        <TrialLockedControl locked={locked}>
                          <FormIconButton
                            label="Delete"
                            icon={Trash2}
                            variant="ghost"
                            disabled={locked}
                            onClick={() => setDeleteTarget(form)}
                          />
                        </TrialLockedControl>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </Panel>
          )}
        </>
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
      <FormSettingsDialog
        open={!!settingsForm}
        onOpenChange={(open) => !open && setSettingsForm(null)}
        form={settingsForm ? forms.find((item) => item.id === settingsForm.id) ?? settingsForm : null}
        orgId={orgId}
        locked={locked}
      />
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
