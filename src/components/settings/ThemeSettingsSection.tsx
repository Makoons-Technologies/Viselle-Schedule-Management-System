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
            Defaults to your device setting. Choose light or dark to override.
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
            Choose an accent color for buttons, navigation, and highlights across the platform.
          </p>
        </CardHeader>
        <CardContent>
          <ThemePicker />
        </CardContent>
      </Card>
    </div>
  );
}
