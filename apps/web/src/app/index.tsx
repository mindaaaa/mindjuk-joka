import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { ErrorBoundary } from '@/app/providers/error-boundary';
import { queryClient } from '@/app/providers/query-client';
import { AppRouter } from '@/app/providers/router';
import { initSentry } from '@/app/providers/sentry';
import { hideSplash, hideSplashWithFloor } from '@/app/splash';
import { useAlbumStore } from '@/entities/album';
import { useAuthStore } from '@/features/auth';
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

if (useAuthStore.getState().status !== 'idle') {
  hideSplashWithFloor();
} else {
  const unsubscribe = useAuthStore.subscribe((state) => {
    if (state.status !== 'idle') {
      unsubscribe();
      hideSplashWithFloor();
    }
  });
  // 타임아웃 안전장치: 무한 대기 방지 (최소 노출 시간 미적용)
  window.setTimeout(() => {
    unsubscribe();
    hideSplash();
  }, 5000);
}
