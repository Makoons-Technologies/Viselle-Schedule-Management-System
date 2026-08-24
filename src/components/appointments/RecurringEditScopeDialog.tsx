import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RecurringEditScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description?: string;
  loading?: boolean;
  onSelectScope: (scope: 'single' | 'future') => void;
}

export function RecurringEditScopeDialog({
  open,
  onOpenChange,
  description = 'This appointment is part of a recurring series. Choose whether to update only this occurrence or this and all future appointments.',
  loading,
  onSelectScope,
}: RecurringEditScopeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update recurring appointment?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            disabled={loading}
            onClick={() => onSelectScope('single')}
          >
            This appointment only
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => onSelectScope('future')}
          >
            This and future
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
