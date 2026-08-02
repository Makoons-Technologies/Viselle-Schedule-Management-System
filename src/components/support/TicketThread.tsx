import { useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Panel } from '@/components/common/Panel';
import {
  AttachmentList,
  AttachmentPicker,
  type PendingSupportFile,
} from '@/components/support/AttachmentExtras';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { fileToSupportAttachmentUpload } from '@/lib/support-attachments';
import { cn } from '@/lib/utils';
import type { SupportAttachmentUpload, SupportTicketMessage } from '@/types/api';

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface TicketThreadProps {
  messages: SupportTicketMessage[];
  currentUserEmail?: string;
  onSubmit: (body: string, isInternalNote: boolean, attachments: SupportAttachmentUpload[]) => void;
  isSubmitting?: boolean;
  showInternalNoteToggle?: boolean;
  disabled?: boolean;
  /** When false, hide attach UI (e.g. custom website notes). Default true. */
  allowAttachments?: boolean;
}

export function TicketThread({
  messages,
  currentUserEmail,
  onSubmit,
  isSubmitting,
  showInternalNoteToggle,
  disabled,
  allowAttachments = true,
}: TicketThreadProps) {
  const [body, setBody] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingSupportFile[]>([]);
  const [encoding, setEncoding] = useState(false);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setEncoding(true);
    try {
      const attachments = await Promise.all(
        pendingFiles.map((item) => fileToSupportAttachmentUpload(item.file)),
      );
      onSubmit(trimmed, isInternalNote, attachments);
      setBody('');
      setIsInternalNote(false);
      pendingFiles.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
      setPendingFiles([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not attach files');
    } finally {
      setEncoding(false);
    }
  };

  return (
    <div className="space-y-4">
      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((message) => {
            const isMine = !!currentUserEmail && message.authorEmail === currentUserEmail;
            return (
              <Panel
                key={message.id}
                className={cn(
                  'p-4',
                  message.isInternalNote && 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
                )}
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <span className="font-medium text-stone-700 dark:text-stone-200">
                    {isMine ? 'You' : message.authorEmail}
                  </span>
                  <span className="flex items-center gap-2">
                    {message.isInternalNote && <Badge variant="warning">Internal note</Badge>}
                    {formatTimestamp(message.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-stone-800 dark:text-stone-100">{message.body}</p>
                <AttachmentList attachments={message.attachments} />
              </Panel>
            );
          })}
        </div>
      )}

      {!disabled && (
        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder="Write a reply…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {allowAttachments && (
            <AttachmentPicker
              files={pendingFiles}
              onChange={setPendingFiles}
              disabled={isSubmitting || encoding}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {showInternalNoteToggle ? (
              <label className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                />
                Internal note (not visible to the ticket creator)
              </label>
            ) : (
              <span />
            )}
            <Button onClick={handleSubmit} disabled={isSubmitting || encoding || !body.trim()}>
              <Send className="h-4 w-4" />
              {isInternalNote ? 'Add note' : 'Send reply'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
