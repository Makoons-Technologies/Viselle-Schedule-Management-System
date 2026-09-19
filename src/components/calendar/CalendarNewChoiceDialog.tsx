import { CalendarPlus, DoorOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CalendarNewChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWalkIn: () => void;
  onSchedule: () => void;
}

export function CalendarNewChoiceDialog({
  open,
  onOpenChange,
  onWalkIn,
  onSchedule,
}: CalendarNewChoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" data-testid="calendar-new-choice">
        <DialogHeader>
          <DialogTitle>New</DialogTitle>
          <DialogDescription>How do you want to add this visit?</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <button
            type="button"
            data-testid="calendar-new-walk-in"
            onClick={() => {
              onOpenChange(false);
              onWalkIn();
            }}
            className="flex min-h-16 items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 dark:border-stone-700 dark:hover:border-brand-500 dark:hover:bg-brand-950/40"
          >
            <DoorOpen className="h-6 w-6 shrink-0 text-brand-700 dark:text-brand-300" />
            <span className="min-w-0">
              <span className="block text-base font-semibold text-stone-900 dark:text-stone-100">
                Walk-in
              </span>
              <span className="block text-sm text-stone-500 dark:text-stone-400">
                They are here now
              </span>
            </span>
          </button>
          <button
            type="button"
            data-testid="calendar-new-schedule"
            onClick={() => {
              onOpenChange(false);
              onSchedule();
            }}
            className="flex min-h-16 items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 dark:border-stone-700 dark:hover:border-brand-500 dark:hover:bg-brand-950/40"
          >
            <CalendarPlus className="h-6 w-6 shrink-0 text-brand-700 dark:text-brand-300" />
            <span className="min-w-0">
              <span className="block text-base font-semibold text-stone-900 dark:text-stone-100">
                Schedule Appointment
              </span>
              <span className="block text-sm text-stone-500 dark:text-stone-400">
                Pick a time on the book
              </span>
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
