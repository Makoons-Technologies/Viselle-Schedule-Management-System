import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import type { PlatformThemeId } from '@/lib/themes';

interface ThemePickerProps {
  compact?: boolean;
  onSelect?: () => void;
}

export function ThemePicker({ compact, onSelect }: ThemePickerProps) {
  const { themeId, setThemeId, themes } = useTheme();

  return (
    <div className={cn('grid gap-3', compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3')}>
      {themes.map((theme) => (
        <button
          key={theme.id}
          type="button"
          onClick={() => {
            setThemeId(theme.id as PlatformThemeId);
            onSelect?.();
          }}
          className={cn(
            'relative rounded-lg border p-3 text-left transition-colors hover:border-stone-300',
            themeId === theme.id ? 'border-brand-500 ring-2 ring-brand-100' : 'border-stone-200 bg-white',
          )}
        >
          <div className="mb-2 flex gap-1">
            {[theme.colors[500], theme.colors[600], theme.colors[700]].map((color) => (
              <span
                key={color}
                className="h-5 w-5 rounded-full border border-black/5"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <p className="text-sm font-medium text-stone-900">{theme.name}</p>
          {!compact && <p className="mt-0.5 text-xs text-stone-500">{theme.description}</p>}
          {themeId === theme.id && (
            <Check className="absolute right-2 top-2 h-4 w-4 text-brand-600" />
          )}
        </button>
      ))}
    </div>
  );
}
