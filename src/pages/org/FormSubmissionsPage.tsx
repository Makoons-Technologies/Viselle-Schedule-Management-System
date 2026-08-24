import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { FormSubmissionsList } from '@/components/forms/FormSubmissionsList';
import { useAuth } from '@/context/AuthContext';
import { useOrgId } from '@/hooks/useOrgId';
import { orgApi } from '@/lib/api';

export function FormSubmissionsPage() {
  const orgId = useOrgId();
  const { formId } = useParams<{ formId: string }>();
  const { user } = useAuth();
  const canView = user?.role === 'org_owner' || user?.role === 'platform_owner';

  const formQuery = useQuery({
    queryKey: ['form', orgId, formId],
    queryFn: () => orgApi.getForm(orgId, formId!),
    enabled: !!orgId && !!formId && canView,
  });
  const customersQuery = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => orgApi.listCustomers(orgId),
    enabled: !!orgId && canView,
  });
  const submissionsQuery = useQuery({
    queryKey: ['form-submissions', orgId, formId],
    queryFn: () => orgApi.listFormSubmissions(orgId, formId),
    enabled: !!orgId && !!formId && canView,
  });

  if (!canView) {
    return (
      <div className="space-y-3">
        <Link to={`/orgs/${orgId}/forms`} className="text-sm text-brand-700 hover:underline">
          ← All forms
        </Link>
        <p className="text-sm text-stone-500">Only the salon owner can view submitted answers.</p>
      </div>
    );
  }

  if (formQuery.isLoading) return <LoadingState />;
  const form = formQuery.data?.form;
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

  const customers = customersQuery.data?.customers ?? [];
  const customerName = (id?: string | null) => {
    if (!id) return 'No client linked';
    const customer = customers.find((item) => item.id === id);
    return customer ? `${customer.firstName} ${customer.lastName}`.trim() : 'Client';
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`${form.name} answers`}
        description={`${form.submissionCount ?? submissionsQuery.data?.submissions.length ?? 0} saved ${
          (form.submissionCount ?? 0) === 1 ? 'response' : 'responses'
        }.`}
      />
      <div className="flex flex-wrap gap-3 text-sm">
        <Link to={`/orgs/${orgId}/forms`} className="text-brand-700 hover:underline">
          ← All forms
        </Link>
        <Link to={`/orgs/${orgId}/forms/${form.id}`} className="text-brand-700 hover:underline">
          Edit form
        </Link>
        {form.status === 'published' ? (
          <Link to={`/orgs/${orgId}/forms/${form.id}/fill`} className="text-brand-700 hover:underline">
            Fill out
          </Link>
        ) : null}
      </div>
      {submissionsQuery.isLoading ? (
        <LoadingState />
      ) : (
        <FormSubmissionsList
          form={form}
          submissions={submissionsQuery.data?.submissions ?? []}
          customerName={customerName}
        />
      )}
    </div>
  );
}
