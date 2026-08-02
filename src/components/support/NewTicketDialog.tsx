import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { supportApi } from '@/lib/api';
import { fileToSupportAttachmentUpload } from '@/lib/support-attachments';
import { SUPPORT_TICKET_TYPES, SUPPORT_TICKET_TYPE_LABELS } from '@/components/support/ticket-types';
import {
  AttachmentPicker,
  type PendingSupportFile,
} from '@/components/support/AttachmentExtras';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  type: z.enum(['support', 'feature_request', 'bug']),
  subject: z.string().trim().min(1, 'Required').max(200),
  body: z.string().trim().min(1, 'Required').max(5000),
});

type FormData = z.infer<typeof schema>;

interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTicketDialog({ open, onOpenChange }: NewTicketDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pendingFiles, setPendingFiles] = useState<PendingSupportFile[]>([]);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'support', subject: '', body: '' },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const attachments = await Promise.all(
        pendingFiles.map((item) => fileToSupportAttachmentUpload(item.file)),
      );
      return supportApi.createTicket({ ...data, attachments });
    },
    onSuccess: ({ ticket }) => {
      toast.success('Ticket submitted');
      queryClient.invalidateQueries({ queryKey: ['support-tickets', 'mine'] });
      reset({ type: 'support', subject: '', body: '' });
      pendingFiles.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
      setPendingFiles([]);
      onOpenChange(false);
      navigate(`/support/${ticket.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          pendingFiles.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
          setPendingFiles([]);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit a ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <Label>Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_TICKET_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {SUPPORT_TICKET_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>}
          </div>
          <div>
            <Label>Subject</Label>
            <Input placeholder="Short summary" {...register('subject')} />
            {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>}
          </div>
          <div>
            <Label>What's going on?</Label>
            <Textarea
              rows={6}
              placeholder="Describe the issue, idea, or bug in as much detail as you can. You can attach screenshots or files below."
              {...register('body')}
            />
            {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
          </div>
          <AttachmentPicker
            files={pendingFiles}
            onChange={setPendingFiles}
            disabled={mutation.isPending}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Submit ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
