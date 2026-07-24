import { useQuery } from '@tanstack/react-query';

import { orgApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { CustomerServiceNote } from '@/types/api';

export function NoteHistoryList({ notes }: { notes: CustomerServiceNote[] }) {
  if (notes.length === 0) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/40">
      <p className="mb-2 text-sm font-medium text-stone-500">
        Previous notes for this service ({notes.length})
      </p>
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {notes.map((note) => (
          <div key={note.id} className="rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900">
            <p className="whitespace-pre-wrap">{note.body}</p>
            <p className="mt-1 text-xs text-stone-400">{formatDateTime(note.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CustomerServiceNoteHistoryProps {
  orgId: string;
  customerId?: string | null;
  serviceId?: string | null;
}

/**
 * Fetches and renders prior notes left for this customer + service pair, so staff
 * can review earlier comments while booking or editing another appointment for the
 * same combination (e.g. "client prefers cooler water", "allergic to X product").
 */
export function CustomerServiceNoteHistory({ orgId, customerId, serviceId }: CustomerServiceNoteHistoryProps) {
  const enabled = !!orgId && !!customerId && !!serviceId;

  const { data } = useQuery({
    queryKey: ['customer-service-notes', orgId, customerId, serviceId],
    queryFn: () => orgApi.listCustomerServiceNotes(orgId, customerId!, serviceId!),
    enabled,
  });

  if (!enabled) return null;

  return <NoteHistoryList notes={data?.notes ?? []} />;
}
