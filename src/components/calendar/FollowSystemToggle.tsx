import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/context/ThemeContext';

/** Compact schedule-chrome control bound to the global color-mode preference. */
export function FollowSystemToggle() {
  const { colorMode, setColorMode, resolvedColorMode } = useTheme();
  const followSystem = colorMode === 'system';

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="follow-system-schedule"
        checked={followSystem}
        onCheckedChange={(checked) => {
          if (checked) {
            setColorMode('system');
            return;
          }
          setColorMode(resolvedColorMode);
        }}
      />
      <Label
        htmlFor="follow-system-schedule"
        className="cursor-pointer text-sm font-normal text-stone-600 dark:text-stone-300"
      >
        Follow system
      </Label>
    </div>
  );
}
