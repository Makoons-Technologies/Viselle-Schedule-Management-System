import { Palette, SunMoon } from 'lucide-react';
import { ColorModePicker } from '@/components/common/ColorModePicker';
import { ThemePicker } from '@/components/common/ThemePicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ThemeSettingsSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SunMoon className="h-4 w-4" />
            Appearance
          </CardTitle>
          <p className="text-sm text-stone-500 dark:text-stone-300">
            Follow system is on by default so the schedule page and app chrome track your device
            light/dark mode. Turn it off to lock light or dark manually.
          </p>
        </CardHeader>
        <CardContent>
          <ColorModePicker />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" />
            Color theme
          </CardTitle>
          <p className="text-sm text-stone-500 dark:text-stone-300">
            Accent colors for buttons, navigation, and highlights. These stay independent of
            light/dark — they do not override system backgrounds or text.
          </p>
        </CardHeader>
        <CardContent>
          <ThemePicker />
        </CardContent>
      </Card>
    </div>
  );
}
