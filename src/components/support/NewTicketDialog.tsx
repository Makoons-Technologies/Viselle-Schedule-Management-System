import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { supportApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) => supportApi.createTicket(data),
    onSuccess: ({ ticket }) => {
      toast.success('Ticket submitted');
      queryClient.invalidateQueries({ queryKey: ['support-tickets', 'mine'] });
      reset();
      onOpenChange(false);
      navigate(`/support/${ticket.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit a ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <Label>Subject</Label>
            <Input placeholder="Short summary of your issue" {...register('subject')} />
            {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>}
          </div>
          <div>
            <Label>What's going on?</Label>
            <Textarea
              rows={6}
              placeholder="Describe the issue or question in as much detail as you can. Screenshots aren't supported yet — just describe what you see."
              {...register('body')}
            />
            {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
          </div>
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
