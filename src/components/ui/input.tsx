import { forwardRef, useRef, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

function isWholeValueEcho(previous: string, next: string): boolean {
  return previous.length >= 2 && next === previous + previous;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, onChange, onInput, value, ...props }, ref) => {
    const lastValueRef = useRef(value !== undefined ? String(value ?? '') : '');

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.currentTarget.value;
      const previous = value !== undefined ? String(value ?? '') : lastValueRef.current;
      // Chrome autofill + controlled transforms can apply the same value twice (BETA→BETABETA).
      if (isWholeValueEcho(previous, next)) {
        event.currentTarget.value = previous;
        return;
      }
      lastValueRef.current = next;
      onChange?.(event);
    };

    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 caret-stone-900 placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-600 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:caret-stone-100 dark:placeholder:text-stone-400 dark:disabled:bg-stone-800 dark:disabled:text-stone-300',
          className,
        )}
        ref={ref}
        value={value}
        {...props}
        onChange={handleChange}
        // React onChange already listens to the native input event. Calling both doubles keystrokes.
        onInput={onChange ? undefined : onInput}
      />
    );
  },
);
Input.displayName = 'Input';
