import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { ErrorBoundary } from '@/app/providers/error-boundary';
import { queryClient } from '@/app/providers/query-client';
import { AppRouter } from '@/app/providers/router';
import { initSentry } from '@/app/providers/sentry';
import { useAlbumStore } from '@/entities/album';
import { initTheme } from '@/features/theme';
import { initAnalytics, setRoleResolver } from '@/shared/lib/analytics';
import { Toaster } from '@/shared/ui/toast';
import './styles/globals.css';

initSentry();
initTheme();
initAnalytics();
setRoleResolver(() => useAlbumStore.getState().current?.role ?? null);

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppRouter />
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>,
  );
}
