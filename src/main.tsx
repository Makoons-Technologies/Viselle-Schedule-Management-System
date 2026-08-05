import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { OrgProvider } from '@/context/OrgContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppToaster } from '@/components/common/AppToaster';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import App from '@/App';
import { applyPlatformTheme, readStoredThemeId } from '@/lib/themes';
import { initColorMode } from '@/lib/color-mode';
import { installClientErrorListeners } from '@/lib/client-errors';
import './index.css';

applyPlatformTheme(readStoredThemeId());
initColorMode();
installClientErrorListeners();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <OrgProvider>
                <App />
                <AppToaster />
              </OrgProvider>
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
