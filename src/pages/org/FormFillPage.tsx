import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { FormioRenderer, collectRequiredGaps } from '@/components/forms/FormioRenderer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { FormioComponent, FormioSchema } from '@/types/api';

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
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save this form')),
  });

  const schema = useMemo<FormioSchema>(
    () => formQuery.data?.form.schema ?? { display: 'form', components: [] },
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
      <Link to={`/orgs/${orgId}/forms`} className="text-sm text-brand-700 hover:underline">
        ← All forms
      </Link>
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
          {(submissionsQuery.data?.submissions ?? []).length === 0 ? (
            <p className="text-sm text-stone-500">Nothing saved yet.</p>
          ) : (
            (submissionsQuery.data?.submissions ?? []).slice(0, 8).map((submission) => (
              <Panel key={submission.id} className="p-4">
                <p className="text-sm font-medium">{customerName(submission.customerId)}</p>
                <p className="text-xs text-stone-500">{formatDateTime(submission.createdAt)}</p>
                <dl className="mt-2 space-y-1 text-sm">
                  {Object.entries(submission.data ?? {}).map(([key, answer]) => (
                    <div key={key} className="flex gap-2">
                      <dt className="shrink-0 text-stone-500">{labelFor(schema, key)}:</dt>
                      <dd className="min-w-0 break-words">{formatAnswer(answer)}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function labelFor(schema: FormioSchema, key: string): string {
  let found = key;
  walk(schema.components ?? [], (component) => {
    if (component.key === key && component.label) found = component.label;
  });
  return found;
}

function walk(components: FormioComponent[], visit: (component: FormioComponent) => void) {
  for (const component of components) {
    visit(component);
    if (component.components?.length) walk(component.components, visit);
    if (component.columns) for (const column of component.columns) walk(column.components ?? [], visit);
    if (component.rows) for (const row of component.rows) for (const cell of row) walk(cell.components ?? [], visit);
  }
}

function formatAnswer(answer: unknown): string {
  if (typeof answer === 'boolean') return answer ? 'Yes' : 'No';
  if (answer == null || answer === '') return '—';
  return String(answer);
}
