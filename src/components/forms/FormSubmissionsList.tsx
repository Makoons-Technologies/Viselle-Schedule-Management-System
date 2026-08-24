import { useState } from 'react';
import { Panel } from '@/components/common/Panel';
import { FormSubmissionDialog } from '@/components/forms/FormSubmissionDialog';
import { Button } from '@/components/ui/button';
import { liveFormSchema, submissionEntries } from '@/lib/forms';
import { formatDateTime } from '@/lib/utils';
import type { Customer, OrgForm, OrgFormSubmission } from '@/types/api';

export function FormSubmissionsList({
  orgId,
  form,
  submissions,
  customers = [],
  customerName,
  empty = 'Nothing saved yet.',
}: {
  orgId: string;
  form: OrgForm;
  submissions: OrgFormSubmission[];
  customers?: Customer[];
  customerName?: (id?: string | null) => string;
  empty?: string;
}) {
  const schema = liveFormSchema(form);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [selected, setSelected] = useState<OrgFormSubmission | null>(null);

  const openSubmission = (next: OrgFormSubmission, nextMode: 'view' | 'edit') => {
    setSelected(next);
    setMode(nextMode);
    setOpen(true);
  };

  if (submissions.length === 0) {
    return <p className="text-sm text-stone-500">{empty}</p>;
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <Panel key={submission.id} className="p-4">
          <p className="text-sm font-medium">{customerName ? customerName(submission.customerId) : 'Submission'}</p>
          <p className="text-xs text-stone-500">
            {formatDateTime(submission.createdAt)}
            {submission.formVersion ? ` · v${submission.formVersion}` : ''}
          </p>
          <dl className="mt-2 space-y-1 text-sm">
            {submissionEntries(submission, schema).map((entry) => (
              <div key={entry.key} className="flex gap-2">
                <dt className="shrink-0 text-stone-500">{entry.label}:</dt>
                <dd className="min-w-0 break-words">{entry.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openSubmission(submission, 'view')}>
              View
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => openSubmission(submission, 'edit')}>
              Edit
            </Button>
          </div>
        </Panel>
      ))}
      <FormSubmissionDialog
        open={open}
        mode={mode}
        orgId={orgId}
        form={form}
        submission={selected}
        customers={customers}
        onOpenChange={setOpen}
        onEdit={() => setMode('edit')}
      />
    </div>
  );
}
