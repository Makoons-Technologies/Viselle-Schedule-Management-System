import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { LoadingState } from '@/components/common/LoadingState';
import { FormioRenderer, collectRequiredGaps } from '@/components/forms/FormioRenderer';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage, orgApi } from '@/lib/api';

export function PublicFormPage() {
  const { shareToken = '' } = useParams<{ shareToken: string }>();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [done, setDone] = useState(false);

  const formQuery = useQuery({
    queryKey: ['public-form', shareToken],
    queryFn: () => orgApi.getPublicForm(shareToken),
    enabled: !!shareToken,
  });

  const submit = useMutation({
    mutationFn: () => orgApi.submitPublicForm(shareToken, { data: values }),
    onSuccess: () => {
      setDone(true);
      setValues({});
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save this form')),
  });

  if (formQuery.isLoading) return <LoadingState />;
  const form = formQuery.data?.form;
  if (!form) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-xl font-semibold">Form unavailable</h1>
        <p className="mt-2 text-sm text-stone-500">This form is private, unpublished, or the link is wrong.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-xl font-semibold">Thanks</h1>
        <p className="mt-2 text-sm text-stone-500">Your answers were saved.</p>
        <Button className="mt-6" variant="outline" onClick={() => setDone(false)}>
          Submit another
        </Button>
      </div>
    );
  }

  const missing = collectRequiredGaps(form.schema, values);

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-10">
      {form.organizationName ? <p className="text-sm text-stone-500">{form.organizationName}</p> : null}
      <div>
        <h1 className="text-2xl font-semibold">{form.name}</h1>
        {form.description ? <p className="mt-1 text-sm text-stone-500">{form.description}</p> : null}
      </div>
      <FormioRenderer schema={form.schema} value={values} onChange={setValues} />
      <Button
        className="h-11 w-full"
        disabled={submit.isPending}
        onClick={() => {
          if (missing.length) {
            toast.error(`Fill in: ${missing.join(', ')}`);
            return;
          }
          submit.mutate();
        }}
      >
        {submit.isPending ? 'Saving…' : 'Submit'}
      </Button>
    </div>
  );
}
