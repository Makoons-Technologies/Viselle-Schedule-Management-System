import { Palette } from 'lucide-react';
import { ThemePicker } from '@/components/common/ThemePicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ThemeSettingsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4" />
          Color theme
        </CardTitle>
        <p className="text-sm text-stone-500">
          Choose an accent color for buttons, navigation, and highlights across the platform.
        </p>
      </CardHeader>
      <CardContent>
        <ThemePicker />
      </CardContent>
    </Card>
  );
}
