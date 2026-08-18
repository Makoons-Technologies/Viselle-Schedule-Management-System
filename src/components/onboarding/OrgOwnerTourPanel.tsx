import { useOrgOwnerTour } from '@/context/OrgOwnerTourContext';
import { Button } from '@/components/ui/button';

export function OrgOwnerTourPanel() {
  const { isActive, step, stepIndex, stepCount, skip, back, next } = useOrgOwnerTour();

  if (!isActive || !step) return null;

  const last = stepIndex >= stepCount - 1;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[60] flex justify-end px-3 md:bottom-6 md:px-6">
      <aside
        className="pointer-events-auto mb-2 w-full max-w-md rounded-xl border border-brand-200 bg-white p-4 shadow-lg dark:border-brand-900 dark:bg-stone-900 md:mb-4"
        role="dialog"
        aria-labelledby="org-owner-tour-title"
        aria-live="polite"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Owner tour · {stepIndex + 1} of {stepCount}
        </p>
        <h2 id="org-owner-tour-title" className="mt-1 text-base font-semibold text-stone-900 dark:text-stone-100">
          {step.title}
        </h2>
        <div className="mt-2 space-y-2 text-sm text-stone-600 dark:text-stone-300">
          {step.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={skip}>
            Skip tour
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={back} disabled={stepIndex === 0}>
              Back
            </Button>
            <Button type="button" size="sm" onClick={next}>
              {last ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
