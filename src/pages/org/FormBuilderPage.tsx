import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DesktopOnlyGate } from '@/components/common/DesktopOnlyGate';
import { LoadingState } from '@/components/common/LoadingState';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { FormioBuilder } from '@/components/forms/FormioBuilder';
import { SettingsBackHeader } from '@/components/settings/SettingsBackHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { getApiErrorMessage, orgApi } from '@/lib/api';
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

  const formQuery = useQuery({
    queryKey: ['form', orgId, formId],
    queryFn: () => orgApi.getForm(orgId, formId!),
    enabled: !!orgId && !!formId,
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
      toast.success('Form saved');
      void queryClient.invalidateQueries({ queryKey: ['forms', orgId] });
      void queryClient.invalidateQueries({ queryKey: ['form', orgId, formId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save form')),
  });

  const publish = useMutation({
    mutationFn: () =>
      orgApi.updateForm(orgId, formId!, { name: name.trim() || form?.name, schema, status: 'published' }),
    onSuccess: () => {
      toast.success('Published — your team can fill this on any phone');
      void queryClient.invalidateQueries({ queryKey: ['forms', orgId] });
      void queryClient.invalidateQueries({ queryKey: ['form', orgId, formId] });
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

  return (
    <div className="space-y-4">
      <SettingsBackHeader
        title={form.name}
        backTo={`/orgs/${orgId}/forms`}
        actions={
          <div className="hidden items-center gap-2 md:flex">
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
      <DesktopOnlyGate
        title="Form builder needs a computer"
        description="Drag-and-drop fields are too cramped on a phone. Open this page on a laptop to edit the form. You can still fill published forms on mobile."
      >
        <div className="space-y-4">
          <div className="max-w-md">
            <Label htmlFor="builder-form-name">Form name</Label>
            <Input id="builder-form-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <FormioBuilder schema={schema} onChange={setSchema} />
        </div>
      </DesktopOnlyGate>
    </div>
  );
}
