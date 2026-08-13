import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { InstallPlatform } from '@/lib/add-to-home-screen';

type AddToHomeScreenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: InstallPlatform;
};

export function AddToHomeScreenDialog({ open, onOpenChange, platform }: AddToHomeScreenDialogProps) {
  const isIos = platform === 'ios';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Home Screen</DialogTitle>
          <DialogDescription>
            {isIos
              ? 'Install Viselle so it opens fullscreen like an app.'
              : 'Install Viselle from your browser so it opens like an app.'}
          </DialogDescription>
        </DialogHeader>
        {isIos ? (
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-stone-700 dark:text-stone-300">
            <li>
              Tap the <span className="font-medium text-stone-900 dark:text-stone-100">Share</span> button
              in Safari (square with an arrow pointing up).
            </li>
            <li>
              Scroll and tap{' '}
              <span className="font-medium text-stone-900 dark:text-stone-100">Add to Home Screen</span>.
            </li>
            <li>Tap Add. Open Viselle from your home screen for the fullscreen app.</li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-stone-700 dark:text-stone-300">
            <li>
              Tap the browser menu (<span className="font-medium text-stone-900 dark:text-stone-100">⋮</span>).
            </li>
            <li>
              Choose{' '}
              <span className="font-medium text-stone-900 dark:text-stone-100">Install app</span> or{' '}
              <span className="font-medium text-stone-900 dark:text-stone-100">Add to Home screen</span>.
            </li>
            <li>Confirm. Open Viselle from your home screen for the fullscreen app.</li>
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
