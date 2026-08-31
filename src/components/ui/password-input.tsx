import { Eye, EyeOff } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type InputHTMLAttributes,
  type MutableRefObject,
  type Ref,
} from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as MutableRefObject<T | null>).current = value;
}

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        assignRef(ref, node);
      },
      [ref],
    );

    const toggleVisible = () => {
      const el = inputRef.current;
      const selectionStart = el?.selectionStart ?? null;
      const selectionEnd = el?.selectionEnd ?? null;
      const nextVisible = !visible;
      setVisible(nextVisible);

      // WebKit keeps password masking painted until the field is touched again
      // after a type change. Nudge the value so the glyphs refresh immediately.
      requestAnimationFrame(() => {
        const input = inputRef.current;
        if (!input) return;
        const value = input.value;
        input.value = `${value}\u200b`;
        input.value = value;
        if (
          document.activeElement === input &&
          selectionStart != null &&
          selectionEnd != null
        ) {
          try {
            input.setSelectionRange(selectionStart, selectionEnd);
          } catch {
            // Some browsers reject selection on password inputs when unfocused.
          }
        }
      });
    };

    return (
      <div className="relative">
        <Input
          ref={setRefs}
          type={visible ? 'text' : 'password'}
          className={cn('pr-10', className)}
          {...props}
        />
        <button
          type="button"
          onClick={toggleVisible}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
