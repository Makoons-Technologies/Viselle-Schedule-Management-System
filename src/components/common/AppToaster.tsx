import { Toaster } from 'sonner';
import { useTheme } from '@/context/ThemeContext';

export function AppToaster() {
  const { resolvedColorMode } = useTheme();

  return <Toaster position="top-right" richColors theme={resolvedColorMode} />;
}
