import { cn } from '@/lib/utils';

export const APPOINTMENT_WIZARD_STEPS = [
  { id: 1, label: 'Staff & service' },
  { id: 2, label: 'Customer' },
  { id: 3, label: 'Schedule' },
] as const;

export type AppointmentWizardStep = (typeof APPOINTMENT_WIZARD_STEPS)[number]['id'];

interface AppointmentWizardStepsProps {
  step: AppointmentWizardStep;
  onStepSelect?: (step: AppointmentWizardStep) => void;
}

export function AppointmentWizardSteps({ step, onStepSelect }: AppointmentWizardStepsProps) {
  return (
    <nav aria-label="New appointment steps" className="mb-1">
      <ol className="flex items-center gap-2">
        {APPOINTMENT_WIZARD_STEPS.map((item, index) => {
          const done = item.id < step;
          const active = item.id === step;
          const canSelect = done && !!onStepSelect;

          return (
            <li key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                disabled={!canSelect}
                onClick={() => onStepSelect?.(item.id)}
                className={cn(
                  'flex min-w-0 flex-col items-center gap-1.5',
                  canSelect && 'cursor-pointer',
                  !canSelect && 'cursor-default',
                )}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    done && 'bg-brand-600 text-white',
                    active && 'border-2 border-brand-600 text-brand-700 dark:text-brand-300',
                    !done && !active && 'border border-stone-200 bg-stone-50 text-stone-400 dark:border-stone-700 dark:bg-stone-800',
                  )}
                >
                  {done ? '✓' : item.id}
                </span>
                <span
                  className={cn(
                    'truncate text-[10px] font-medium sm:text-xs',
                    active || done
                      ? 'text-brand-700 dark:text-brand-300'
                      : 'text-stone-400 dark:text-stone-500',
                  )}
                >
                  {item.label}
                </span>
              </button>
              {index < APPOINTMENT_WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    'mb-5 h-px flex-1',
                    item.id < step ? 'bg-brand-600' : 'bg-stone-200 dark:bg-stone-700',
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
