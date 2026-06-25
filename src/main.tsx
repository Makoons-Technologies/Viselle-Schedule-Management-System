import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { OrgProvider } from '@/context/OrgContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppToaster } from '@/components/common/AppToaster';
import App from '@/App';
import { applyPlatformTheme, readStoredThemeId } from '@/lib/themes';
import { initColorMode } from '@/lib/color-mode';
import './index.css';

applyPlatformTheme(readStoredThemeId());
initColorMode();

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
  </StrictMode>,
);
