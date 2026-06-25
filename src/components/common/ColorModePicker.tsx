import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import type { ColorMode } from '@/lib/color-mode';

const OPTIONS: { id: ColorMode; label: string; description: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', description: 'Always use light mode', icon: Sun },
  { id: 'dark', label: 'Dark', description: 'Always use dark mode', icon: Moon },
  { id: 'system', label: 'System', description: 'Match your device settings', icon: Monitor },
];

export function ColorModePicker() {
  const { colorMode, setColorMode } = useTheme();

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {OPTIONS.map((option) => {
        const selected = colorMode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setColorMode(option.id)}
            className={cn(
              'relative flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
              selected
                ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100 dark:bg-brand-950/40 dark:ring-brand-900'
                : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-600',
            )}
          >
            <option.icon className="mt-0.5 h-4 w-4 shrink-0 text-stone-600 dark:text-stone-300" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{option.label}</p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{option.description}</p>
            </div>
            {selected ? <Check className="absolute right-2 top-2 h-4 w-4 text-brand-600" /> : null}
          </button>
        );
      })}
    </div>
  );
}
