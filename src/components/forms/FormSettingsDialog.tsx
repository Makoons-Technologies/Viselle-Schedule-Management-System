import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { formIsPublic, formPrivateUrl, formPublicUrl } from '@/lib/forms';
import type { OrgForm } from '@/types/api';

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function FormSettingsDialog({
  open,
  onOpenChange,
  form,
  orgId,
  locked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: OrgForm | null;
  orgId: string;
  locked: boolean;
}) {
  const queryClient = useQueryClient();
  const isPublic = form ? formIsPublic(form) : true;

  const update = useMutation({
    mutationFn: (visibility: 'public' | 'private') => orgApi.updateForm(orgId, form!.id, { visibility }),
    onSuccess: () => {
      toast.success('Form settings saved');
      void queryClient.invalidateQueries({ queryKey: ['forms', orgId] });
      void queryClient.invalidateQueries({ queryKey: ['form', orgId, form?.id] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not update form settings')),
  });

  if (!form) return null;

  const publicUrl = formPublicUrl(form.shareToken);
  const privateUrl = formPrivateUrl(orgId, form.id);
  const canSharePublic = isPublic && form.status === 'published' && Boolean(publicUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Form settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label>Public form</Label>
              <p className="mt-1 text-sm text-stone-500">
                Anyone with the public link can fill this out. New forms start public.
              </p>
            </div>
            <TrialLockedControl locked={locked}>
              <Switch
                checked={isPublic}
                disabled={locked || update.isPending}
                onCheckedChange={(checked) => update.mutate(checked ? 'public' : 'private')}
              />
            </TrialLockedControl>
          </div>
          <div className="space-y-2">
            <Label>Public link</Label>
            <p className="break-all rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700">
              {canSharePublic ? publicUrl : 'Publish this form and keep it public to share a client link.'}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canSharePublic}
              onClick={() =>
                copyText(publicUrl)
                  .then(() => toast.success('Public link copied'))
                  .catch(() => toast.error('Could not copy link'))
              }
            >
              <Copy className="h-3.5 w-3.5" />
              Copy public link
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Private staff link</Label>
            <p className="break-all rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700">
              {privateUrl}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                copyText(privateUrl)
                  .then(() => toast.success('Private link copied'))
                  .catch(() => toast.error('Could not copy link'))
              }
            >
              <Copy className="h-3.5 w-3.5" />
              Copy private link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
