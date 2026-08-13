import { Smartphone, X } from 'lucide-react';
import { AddToHomeScreenDialog } from '@/components/settings/AddToHomeScreenDialog';
import { Button } from '@/components/ui/button';
import { useAddToHomeScreen } from '@/hooks/useAddToHomeScreen';

/**
 * Compact, dismissible install CTA for authenticated mobile users.
 * Android Chrome/Edge/Samsung: one-tap native prompt when available.
 * iOS: opens Share-sheet steps — never a fake install button.
 */
export function AddToHomeScreenBanner() {
  const {
    showBanner,
    canPrompt,
    platform,
    handleAddToHomeScreen,
    instructionsOpen,
    setInstructionsOpen,
    dismissBanner,
  } = useAddToHomeScreen();

  if (!showBanner) return null;

  const isIos = platform === 'ios';
  const actionLabel = canPrompt ? 'Install' : isIos ? 'Show steps' : 'How';

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-950 dark:border-brand-900 dark:bg-brand-950/50 dark:text-brand-100">
        <Smartphone className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden />
        <p className="min-w-0 flex-1 leading-snug">Add Viselle to your home screen</p>
        <Button
          type="button"
          size="sm"
          className="h-7 shrink-0 rounded-full px-3 text-xs"
          onClick={() => void handleAddToHomeScreen()}
        >
          {actionLabel}
        </Button>
        <button
          type="button"
          onClick={dismissBanner}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-brand-800 hover:bg-brand-100 dark:text-brand-200 dark:hover:bg-brand-900"
          aria-label="Dismiss add to home screen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <AddToHomeScreenDialog
        open={instructionsOpen}
        onOpenChange={setInstructionsOpen}
        platform={platform}
      />
    </>
  );
}
