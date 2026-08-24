import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormioRenderer } from '@/components/forms/FormioRenderer';
import { LoadingState } from '@/components/common/LoadingState';
import { TrialLockedControl } from '@/components/common/TrialLockedControl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { OrgFormVersion } from '@/types/api';

export function FormVersionsDialog({
  open,
  onOpenChange,
  orgId,
  formId,
  locked,
  currentVersion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  formId: string;
  locked: boolean;
  currentVersion?: number;
}) {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<OrgFormVersion | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const versionsQuery = useQuery({
    queryKey: ['form-versions', orgId, formId],
    queryFn: () => orgApi.listFormVersions(orgId, formId),
    enabled: open && !!orgId && !!formId,
  });

  const restore = useMutation({
    mutationFn: (versionNumber: number) => orgApi.restoreFormVersion(orgId, formId, versionNumber),
    onSuccess: (_, versionNumber) => {
      toast.success(`Version ${versionNumber} restored to staging`);
      void queryClient.invalidateQueries({ queryKey: ['form', orgId, formId] });
      void queryClient.invalidateQueries({ queryKey: ['forms', orgId] });
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not restore that version')),
  });

  const versions = versionsQuery.data?.versions ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPreview(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{preview ? `Version ${preview.versionNumber}` : 'Form versions'}</DialogTitle>
        </DialogHeader>
        {versionsQuery.isLoading ? <LoadingState /> : null}
        {!versionsQuery.isLoading && preview ? (
          <div className="space-y-4">
            <p className="text-sm text-stone-500">
              Saved {formatDateTime(preview.createdAt)}. Restoring puts this copy into staging without changing what
              clients see.
            </p>
            <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
              <FormioRenderer schema={preview.schema} value={values} onChange={setValues} disabled />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setPreview(null)}>
                Back to versions
              </Button>
              <TrialLockedControl locked={locked}>
                <Button
                  type="button"
                  disabled={locked || restore.isPending}
                  onClick={() => restore.mutate(preview.versionNumber)}
                >
                  Restore to staging
                </Button>
              </TrialLockedControl>
            </div>
          </div>
        ) : null}
        {!versionsQuery.isLoading && !preview ? (
          versions.length === 0 ? (
            <p className="text-sm text-stone-500">No published versions yet.</p>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex flex-col gap-2 rounded-xl border border-stone-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800"
                >
                  <div>
                    <p className="font-medium">
                      Version {version.versionNumber}
                      {version.versionNumber === currentVersion ? ' · current live' : ''}
                    </p>
                    <p className="text-xs text-stone-500">{formatDateTime(version.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setValues({});
                        setPreview(version);
                      }}
                    >
                      View
                    </Button>
                    <TrialLockedControl locked={locked}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={locked || restore.isPending}
                        onClick={() => restore.mutate(version.versionNumber)}
                      >
                        Restore
                      </Button>
                    </TrialLockedControl>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
