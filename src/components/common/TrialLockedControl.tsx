import type { ReactNode } from 'react';
import { TRIAL_LOCKED_MESSAGE } from '@/lib/trial';

interface TrialLockedControlProps {
  locked: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a disabled button/control so its "Trial expired" tooltip still shows
 * on hover. Disabled buttons get `pointer-events: none` (see button.tsx),
 * which stops the browser from hit-testing the element at all — so a
 * `title` on the button itself never triggers. Putting the `title` on this
 * wrapping span (which keeps normal pointer events) fixes that.
 */
export function TrialLockedControl({ locked, children, className }: TrialLockedControlProps) {
  if (!locked) return <>{children}</>;
  return (
    <span className={className} title={TRIAL_LOCKED_MESSAGE}>
      {children}
    </span>
  );
}
