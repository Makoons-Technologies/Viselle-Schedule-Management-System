import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { FormioRenderer, collectRequiredGaps } from '@/components/forms/FormioRenderer';
import { FormSubmissionsList } from '@/components/forms/FormSubmissionsList';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { liveFormSchema } from '@/lib/forms';
import type { FormioSchema } from '@/types/api';

export function FormFillPage() {
  const orgId = useOrgId();
  const { formId } = useParams<{ formId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.role === 'org_owner' || user?.role === 'platform_owner';
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [customerId, setCustomerId] = useState('');

  const formQuery = useQuery({
    queryKey: ['form', orgId, formId],
    queryFn: () => orgApi.getForm(orgId, formId!),
    enabled: !!orgId && !!formId,
  });
  const customersQuery = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId,
  });
  const submissionsQuery = useQuery({
    queryKey: ['form-submissions', orgId, formId],
    queryFn: () => orgApi.listFormSubmissions(orgId, formId),
    enabled: !!orgId && !!formId && isOwner,
  });

  const submit = useMutation({
    mutationFn: () =>
      orgApi.submitForm(orgId, formId!, { data: values, customerId: customerId || undefined }),
    onSuccess: () => {
      toast.success('Saved');
      setValues({});
      void queryClient.invalidateQueries({ queryKey: ['form-submissions', orgId, formId] });
      void queryClient.invalidateQueries({ queryKey: ['form', orgId, formId] });
      void queryClient.invalidateQueries({ queryKey: ['forms', orgId] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save this form')),
  });

  const schema = useMemo<FormioSchema>(
    () => (formQuery.data?.form ? liveFormSchema(formQuery.data.form) : { display: 'form', components: [] }),
    [formQuery.data],
  );
  const customers = customersQuery.data?.customers ?? [];
  const customerName = (id?: string | null) => {
    if (!id) return 'No client linked';
    const customer = customers.find((item) => item.id === id);
    return customer ? `${customer.firstName} ${customer.lastName}`.trim() : 'Client';
  };

  if (formQuery.isLoading) return <LoadingState />;
  const form = formQuery.data?.form;
  if (!form) {
    return (
      <div className="mx-auto max-w-xl space-y-3">
        <Link to={`/orgs/${orgId}/forms`} className="text-sm text-brand-700 hover:underline">
          ← All forms
        </Link>
        <p className="text-sm text-stone-500">Form not found.</p>
      </div>
    );
  }

  const canSubmit = form.status === 'published';
  const missing = canSubmit ? collectRequiredGaps(schema, values) : [];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title={form.name} description={form.description || 'Fill this out with the client.'} />
      <div className="flex flex-wrap gap-3 text-sm">
        <Link to={`/orgs/${orgId}/forms`} className="text-brand-700 hover:underline">
          ← All forms
        </Link>
        {isOwner ? (
          <Link to={`/orgs/${orgId}/forms/${form.id}/submissions`} className="text-brand-700 hover:underline">
            View all answers
          </Link>
        ) : null}
      </div>
      {!canSubmit ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          This form is not published yet, so answers cannot be saved.
        </p>
      ) : null}
      <div>
        <Label htmlFor="fill-customer">Client (optional)</Label>
        <select
          id="fill-customer"
          className="mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-base dark:border-stone-700 dark:bg-stone-900"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
        >
          <option value="">Not linked</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.firstName} {customer.lastName}
            </option>
          ))}
        </select>
      </div>
      <FormioRenderer schema={schema} value={values} onChange={setValues} disabled={!canSubmit} orgId={orgId} />
      <Button
        className="h-11 w-full"
        disabled={!canSubmit || submit.isPending}
        onClick={() => {
          if (missing.length) {
            toast.error(`Fill in: ${missing.join(', ')}`);
            return;
          }
          submit.mutate();
        }}
      >
        {submit.isPending ? 'Saving…' : 'Save answers'}
      </Button>
      {isOwner ? (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-stone-500">Recent answers</h2>
          <FormSubmissionsList
            form={form}
            submissions={(submissionsQuery.data?.submissions ?? []).slice(0, 8)}
            customerName={customerName}
          />
        </div>
      ) : null}
    </div>
  );
}
