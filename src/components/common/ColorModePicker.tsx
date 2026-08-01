import { Moon, Sun } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

/**
 * Follow-system toggle (ON by default via DEFAULT_COLOR_MODE = 'system').
 * When off, light/dark are chosen manually. Brand accent colors stay independent.
 */
export function ColorModePicker() {
  const { colorMode, setColorMode, resolvedColorMode } = useTheme();
  const followSystem = colorMode === 'system';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
        <div className="min-w-0">
          <Label htmlFor="follow-system-appearance" className="cursor-pointer">
            Follow system
          </Label>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            Schedule and app chrome match your device light or dark setting. Accent colors still apply.
          </p>
        </div>
        <Switch
          id="follow-system-appearance"
          checked={followSystem}
          onCheckedChange={(checked) => {
            if (checked) {
              setColorMode('system');
              return;
            }
            // Keep the current resolved look when leaving system mode.
            setColorMode(resolvedColorMode);
          }}
        />
      </div>

      {!followSystem ? (
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'light' as const, label: 'Light', icon: Sun },
              { id: 'dark' as const, label: 'Dark', icon: Moon },
            ] as const
          ).map((option) => {
            const selected = colorMode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setColorMode(option.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  selected
                    ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-100 dark:bg-brand-950/40 dark:text-brand-200 dark:ring-brand-900'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-stone-600',
                )}
              >
                <option.icon className="h-4 w-4 shrink-0" />
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
