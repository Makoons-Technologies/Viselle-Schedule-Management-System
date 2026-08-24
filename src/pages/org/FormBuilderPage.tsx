import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DesktopOnlyGate } from '@/components/common/DesktopOnlyGate';
import { LoadingState } from '@/components/common/LoadingState';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { FormioBuilder } from '@/components/forms/FormioBuilder';
import { FormSettingsDialog } from '@/components/forms/FormSettingsDialog';
import { FormVersionsDialog } from '@/components/forms/FormVersionsDialog';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { formVersionLabel } from '@/lib/forms';
import type { FormioSchema } from '@/types/api';

const EMPTY: FormioSchema = { display: 'form', components: [] };

export function FormBuilderPage() {
  const orgId = useOrgId();
  const { formId } = useParams<{ formId: string }>();
  const { user } = useAuth();
  const locked = useOrgWriteLocked();
  const queryClient = useQueryClient();
  const canEdit = user?.role === 'org_owner' || user?.role === 'platform_owner';
  const [name, setName] = useState('');
  const [schema, setSchema] = useState<FormioSchema>(EMPTY);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const formQuery = useQuery({
    queryKey: ['form', orgId, formId],
    queryFn: () => orgApi.getForm(orgId, formId!),
    enabled: !!orgId && !!formId,
  });
  const formsQuery = useQuery({
    queryKey: ['forms', orgId],
    queryFn: () => orgApi.listForms(orgId),
    enabled: !!orgId,
  });

  const form = formQuery.data?.form;

  useEffect(() => {
    if (!form) return;
    setName(form.name);
    setSchema(form.schema ?? EMPTY);
  }, [form]);

  const save = useMutation({
    mutationFn: () => orgApi.updateForm(orgId, formId!, { name: name.trim() || form?.name, schema }),
    onSuccess: () => {
      toast.success(form?.status === 'published' ? 'Staging saved — live form is unchanged' : 'Form saved');
      void queryClient.invalidateQueries({ queryKey: ['forms', orgId] });
      void queryClient.invalidateQueries({ queryKey: ['form', orgId, formId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save form')),
  });

  const publish = useMutation({
    mutationFn: () =>
      orgApi.updateForm(orgId, formId!, { name: name.trim() || form?.name, schema, status: 'published' }),
    onSuccess: () => {
      toast.success('Published — your team and public link use this version');
      void queryClient.invalidateQueries({ queryKey: ['forms', orgId] });
      void queryClient.invalidateQueries({ queryKey: ['form', orgId, formId] });
      void queryClient.invalidateQueries({ queryKey: ['form-versions', orgId, formId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not publish')),
  });

  if (formQuery.isLoading) return <LoadingState />;
  if (!form) {
    return (
      <div className="space-y-3">
        <Link to={`/orgs/${orgId}/forms`} className="text-sm text-brand-700 hover:underline">
          ← All forms
        </Link>
        <p className="text-sm text-stone-500">Form not found.</p>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="space-y-3">
        <SettingsBackHeader title={form.name} backTo={`/orgs/${orgId}/forms`} />
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Only the salon owner can edit this form.{' '}
          {form.status === 'published' ? (
            <Link to={`/orgs/${orgId}/forms/${form.id}/fill`} className="text-brand-700 hover:underline">
              Fill it out instead
            </Link>
          ) : (
            'Ask them to publish it, then you can fill it on any phone.'
          )}
        </p>
      </div>
    );
  }

  const version = formVersionLabel(form);

  return (
    <div className="space-y-4">
      <SettingsBackHeader
        title={form.name}
        backTo={`/orgs/${orgId}/forms`}
        actions={
          <div className="hidden items-center gap-2 md:flex">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/orgs/${orgId}/forms/${form.id}/submissions`}>
                Answers{typeof form.submissionCount === 'number' ? ` (${form.submissionCount})` : ''}
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setVersionsOpen(true)}>
              <History className="h-3.5 w-3.5" />
              Versions
            </Button>
            <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
              <span className="sr-only">Form settings</span>
            </Button>
            <TrialLockedControl locked={locked}>
              <Button variant="outline" disabled={locked || save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
            </TrialLockedControl>
            <TrialLockedControl locked={locked}>
              <Button disabled={locked || publish.isPending} onClick={() => publish.mutate()}>
                {form.status === 'published' ? 'Save & keep published' : 'Publish'}
              </Button>
            </TrialLockedControl>
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={form.status === 'published' ? 'success' : 'secondary'}>
          {form.status === 'published' ? 'Published' : 'Draft'}
        </Badge>
        {version ? <Badge variant="outline">{version}</Badge> : null}
        {form.hasUnpublishedChanges ? <Badge variant="warning">Staging</Badge> : null}
        <Badge variant="outline">{form.visibility === 'private' ? 'Private' : 'Public'}</Badge>
      </div>
      {form.status === 'published' ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          You are editing a staging copy. Clients still see {version ?? 'the live version'} until you publish.
        </p>
      ) : null}
      <DesktopOnlyGate
        title="Form builder needs a computer"
        description="Drag-and-drop fields are too cramped on a phone. Open this page on a laptop to edit the form. You can still fill published forms on mobile."
      >
        <div className="space-y-4">
          <div className="max-w-md">
            <Label htmlFor="builder-form-name">Form name</Label>
            <Input id="builder-form-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <FormioBuilder schema={schema} onChange={setSchema} orgId={orgId} forms={formsQuery.data?.forms ?? []} />
        </div>
      </DesktopOnlyGate>
      <FormSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        form={form}
        orgId={orgId}
        locked={locked}
      />
      <FormVersionsDialog
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        orgId={orgId}
        formId={form.id}
        locked={locked}
        currentVersion={form.currentVersion}
      />
    </div>
  );
}
