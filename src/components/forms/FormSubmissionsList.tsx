import { Panel } from '@/components/common/Panel';
import { liveFormSchema, submissionEntries } from '@/lib/forms';
import { formatDateTime } from '@/lib/utils';
import type { OrgForm, OrgFormSubmission } from '@/types/api';

export function FormSubmissionsList({
  form,
  submissions,
  customerName,
  empty = 'Nothing saved yet.',
}: {
  form: OrgForm;
  submissions: OrgFormSubmission[];
  customerName?: (id?: string | null) => string;
  empty?: string;
}) {
  const schema = liveFormSchema(form);
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
        </Panel>
      ))}
    </div>
  );
}
