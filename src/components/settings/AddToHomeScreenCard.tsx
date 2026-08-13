import { Smartphone } from 'lucide-react';
import { AddToHomeScreenDialog } from '@/components/settings/AddToHomeScreenDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAddToHomeScreen } from '@/hooks/useAddToHomeScreen';

/** Persistent account-settings install CTA (staff never see the Settings hub). */
export function AddToHomeScreenCard() {
  const {
    showRow,
    canPrompt,
    platform,
    handleAddToHomeScreen,
    instructionsOpen,
    setInstructionsOpen,
  } = useAddToHomeScreen();

  if (!showRow) return null;

  const isIos = platform === 'ios';
  const actionLabel = canPrompt ? 'Install' : isIos ? 'Show steps' : 'How';
  const description = canPrompt
    ? 'Install Viselle with one tap so it opens fullscreen like an app.'
    : isIos
      ? 'Use Safari Share to add Viselle to your Home Screen.'
      : 'Install Viselle from your browser menu so it opens like an app.';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4" />
            Add to Home Screen
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => void handleAddToHomeScreen()}>
            {actionLabel}
          </Button>
        </CardContent>
      </Card>
      <AddToHomeScreenDialog
        open={instructionsOpen}
        onOpenChange={setInstructionsOpen}
        platform={platform}
      />
    </>
  );
}
