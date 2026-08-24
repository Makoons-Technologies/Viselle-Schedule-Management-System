import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormioRenderer, collectRequiredGaps } from '@/components/forms/FormioRenderer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { liveFormSchema, submissionEntries } from '@/lib/forms';
import { formatDateTime } from '@/lib/utils';
import type { Customer, OrgForm, OrgFormSubmission } from '@/types/api';

export function FormSubmissionDialog({
  open,
  mode,
  orgId,
  form,
  submission,
  customers,
  onOpenChange,
  onEdit,
}: {
  open: boolean;
  mode: 'view' | 'edit';
  orgId: string;
  form: OrgForm;
  submission: OrgFormSubmission | null;
  customers: Customer[];
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const schema = useMemo(() => liveFormSchema(form), [form]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    if (!submission || !open) return;
    setValues({ ...(submission.data ?? {}) });
    setCustomerId(submission.customerId ?? '');
  }, [submission, open]);

  const save = useMutation({
    mutationFn: () =>
      orgApi.updateFormSubmission(orgId, form.id, submission!.id, {
        data: values,
        customerId: customerId || null,
      }),
    onSuccess: () => {
      toast.success('Response saved');
      void queryClient.invalidateQueries({ queryKey: ['form-submissions', orgId, form.id] });
      void queryClient.invalidateQueries({ queryKey: ['form', orgId, form.id] });
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save this response')),
  });

  if (!submission) return null;

  const linkedName = (() => {
    if (!submission.customerId) return 'No client linked';
    const customer = customers.find((item) => item.id === submission.customerId);
    return customer ? `${customer.firstName} ${customer.lastName}`.trim() : 'Client';
  })();
  const entries = submissionEntries(submission, schema);
  const missing = mode === 'edit' ? collectRequiredGaps(schema, values) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit response' : 'View response'}</DialogTitle>
          <DialogDescription>
            {linkedName} · {formatDateTime(submission.createdAt)}
            {submission.formVersion ? ` · v${submission.formVersion}` : ''}
          </DialogDescription>
        </DialogHeader>

        {mode === 'view' ? (
          <div className="space-y-4">
            <dl className="space-y-2 text-sm">
              {entries.map((entry) => (
                <div key={entry.key} className="flex gap-2">
                  <dt className="shrink-0 text-stone-500">{entry.label}:</dt>
                  <dd className="min-w-0 break-words">{entry.value}</dd>
                </div>
              ))}
            </dl>
            <FormioRenderer schema={schema} value={submission.data ?? {}} onChange={() => undefined} disabled orgId={orgId} />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-response-customer">Client (optional)</Label>
              <select
                id="edit-response-customer"
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
            <FormioRenderer schema={schema} value={values} onChange={setValues} orgId={orgId} />
          </div>
        )}

        <DialogFooter>
          {mode === 'view' ? (
            <Button type="button" onClick={onEdit}>
              Edit
            </Button>
          ) : (
            <Button
              type="button"
              disabled={save.isPending}
              onClick={() => {
                if (missing.length) {
                  toast.error(`Fill in: ${missing.join(', ')}`);
                  return;
                }
                save.mutate();
              }}
            >
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
