import { FileIcon, Paperclip, X } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_ATTACHMENT_MAX_COUNT,
  formatFileSize,
  isImageContentType,
  resolveSupportContentType,
} from '@/lib/support-attachments';
import { cn } from '@/lib/utils';
import type { SupportTicketAttachment } from '@/types/api';

export interface PendingSupportFile {
  id: string;
  file: File;
  previewUrl?: string;
}

interface AttachmentPickerProps {
  files: PendingSupportFile[];
  onChange: (files: PendingSupportFile[]) => void;
  disabled?: boolean;
  className?: string;
}

export function AttachmentPicker({ files, onChange, disabled, className }: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const next = [...files];
    for (const file of incoming) {
      if (next.length >= SUPPORT_ATTACHMENT_MAX_COUNT) {
        toast.error(`At most ${SUPPORT_ATTACHMENT_MAX_COUNT} files`);
        break;
      }
      if (!resolveSupportContentType(file)) {
        toast.error(`Unsupported file type: ${file.name}`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} must be 5 MB or smaller`);
        continue;
      }
      const contentType = resolveSupportContentType(file)!;
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: isImageContentType(contentType) ? URL.createObjectURL(file) : undefined,
      });
    }
    onChange(next);
  }

  function removeAt(id: string) {
    const target = files.find((f) => f.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    onChange(files.filter((f) => f.id !== id));
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={SUPPORT_ATTACHMENT_ACCEPT}
        multiple
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || files.length >= SUPPORT_ATTACHMENT_MAX_COUNT}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
          Attach files
        </Button>
        <span className="text-xs text-stone-500 dark:text-stone-400">
          Images, PDF, Office docs · up to 5 files · 5 MB each
        </span>
      </div>
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((item) => (
            <li
              key={item.id}
              className="relative flex max-w-full items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs dark:border-stone-700 dark:bg-stone-900"
            >
              {item.previewUrl ? (
                <img src={item.previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <FileIcon className="h-4 w-4 shrink-0 text-stone-500" />
              )}
              <span className="min-w-0 truncate">
                {item.file.name}
                <span className="ml-1 text-stone-400">({formatFileSize(item.file.size)})</span>
              </span>
              <button
                type="button"
                className="rounded p-0.5 text-stone-500 hover:bg-stone-200 hover:text-stone-800 dark:hover:bg-stone-700 dark:hover:text-stone-100"
                aria-label={`Remove ${item.file.name}`}
                disabled={disabled}
                onClick={() => removeAt(item.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface AttachmentListProps {
  attachments?: SupportTicketAttachment[];
  className?: string;
}

export function AttachmentList({ attachments, className }: AttachmentListProps) {
  if (!attachments?.length) return null;

  return (
    <ul className={cn('mt-3 flex flex-wrap gap-3', className)}>
      {attachments.map((attachment) => {
        const isImage = isImageContentType(attachment.contentType);
        const href = attachment.url;
        return (
          <li key={attachment.id} className="max-w-full">
            {isImage && href ? (
              <a href={href} target="_blank" rel="noreferrer" className="block">
                <img
                  src={href}
                  alt={attachment.fileName}
                  className="max-h-48 max-w-full rounded-md border border-stone-200 object-contain dark:border-stone-700"
                />
              </a>
            ) : (
              <a
                href={href || undefined}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'inline-flex max-w-full items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800',
                  !href && 'pointer-events-none opacity-60',
                )}
              >
                <FileIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{attachment.fileName}</span>
                <span className="shrink-0 text-xs text-stone-500">
                  ({formatFileSize(attachment.sizeBytes)})
                </span>
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
