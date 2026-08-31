import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type BlockingProgressValue = { current: number; total: number } | null;

export interface BlockingProgressDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Determinate steps only. Omit or pass null for an indeterminate spinner. */
  progress?: BlockingProgressValue;
  /** Shown only while abort is still safe. Hide once the server has committed. */
  onCancel?: () => void;
  cancelLabel?: string;
}

export type BlockingProgressStart = Omit<BlockingProgressDialogProps, 'open'>;

type BlockingProgressState = BlockingProgressStart & { open: boolean };

const INITIAL: BlockingProgressState = {
  open: false,
  title: '',
  message: '',
  progress: null,
  onCancel: undefined,
};

export function useBlockingProgress() {
  const [state, setState] = useState<BlockingProgressState>(INITIAL);

  const start = useCallback((opts: BlockingProgressStart) => {
    setState({
      open: true,
      title: opts.title,
      message: opts.message,
      progress: opts.progress ?? null,
      onCancel: opts.onCancel,
      cancelLabel: opts.cancelLabel,
    });
  }, []);

  const update = useCallback((opts: Partial<BlockingProgressStart>) => {
    setState((prev) => ({
      ...prev,
      ...(opts.title != null ? { title: opts.title } : {}),
      ...(opts.message != null ? { message: opts.message } : {}),
      ...(opts.progress !== undefined ? { progress: opts.progress } : {}),
      ...('onCancel' in opts ? { onCancel: opts.onCancel } : {}),
      ...(opts.cancelLabel != null ? { cancelLabel: opts.cancelLabel } : {}),
    }));
  }, []);

  const stop = useCallback(() => {
    setState(INITIAL);
  }, []);

  return {
    start,
    update,
    stop,
    dialogProps: {
      open: state.open,
      title: state.title,
      message: state.message,
      progress: state.progress,
      onCancel: state.onCancel,
      cancelLabel: state.cancelLabel,
    } satisfies BlockingProgressDialogProps,
  };
}

function DeterminateBar({ current, total }: { current: number; total: number }) {
  const safeTotal = Math.max(total, 1);
  const clamped = Math.min(Math.max(current, 0), safeTotal);
  const pct = (clamped / safeTotal) * 100;

  return (
    <div className="space-y-2">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={clamped}
        aria-valuetext={`${clamped} of ${safeTotal}`}
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        {clamped} of {safeTotal}
      </p>
    </div>
  );
}

function IndeterminateBar() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-600" aria-hidden />
        <div
          className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"
          role="progressbar"
          aria-valuetext="In progress"
        >
          <div className="absolute inset-y-0 w-1/3 rounded-full bg-brand-600 animate-blocking-progress" />
        </div>
      </div>
    </div>
  );
}

export function BlockingProgressDialog({
  open,
  title,
  message,
  progress,
  onCancel,
  cancelLabel = 'Cancel',
}: BlockingProgressDialogProps) {
  const determinate = progress != null && progress.total > 0;

  return (
    <Dialog open={open}>
      <DialogPortal>
        <DialogOverlay className="z-[80] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          role="alertdialog"
          aria-busy={open || undefined}
          aria-modal="true"
          tabIndex={-1}
          className={cn(
            'fixed left-1/2 top-1/2 z-[80] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-stone-200 bg-white p-5 shadow-xl outline-none sm:p-6 dark:border-stone-800 dark:bg-stone-900',
          )}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            onCancel?.();
          }}
        >
          <DialogPrimitive.Title className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            aria-live="polite"
            aria-atomic="true"
            className="mt-2 text-sm text-stone-500 dark:text-stone-400"
          >
            {message}
          </DialogPrimitive.Description>
          <div className="mt-4">{determinate ? <DeterminateBar current={progress.current} total={progress.total} /> : <IndeterminateBar />}</div>
          {onCancel ? (
            <div className="mt-5 flex justify-end">
              <Button type="button" variant="outline" onClick={onCancel}>
                {cancelLabel}
              </Button>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
