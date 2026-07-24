import { useState } from 'react';
import { Send } from 'lucide-react';
import { Panel } from '@/components/common/Panel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SupportTicketMessage } from '@/types/api';

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
  onSubmit: (body: string, isInternalNote: boolean) => void;
  isSubmitting?: boolean;
  showInternalNoteToggle?: boolean;
  disabled?: boolean;
}

export function TicketThread({
  messages,
  currentUserEmail,
  onSubmit,
  isSubmitting,
  showInternalNoteToggle,
  disabled,
}: TicketThreadProps) {
  const [body, setBody] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const handleSubmit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    onSubmit(trimmed, isInternalNote);
    setBody('');
    setIsInternalNote(false);
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
            <Button onClick={handleSubmit} disabled={isSubmitting || !body.trim()}>
              <Send className="h-4 w-4" />
              {isInternalNote ? 'Add note' : 'Send reply'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
