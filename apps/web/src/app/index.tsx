import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { ErrorBoundary } from '@/app/providers/error-boundary';
import { queryClient } from '@/app/providers/query-client';
import { initSentry } from '@/app/providers/sentry';
import { Toaster } from '@/shared/ui/toast';
import './styles/globals.css';

initSentry();

function App() {
  return (
    <div id="app-root" className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold">Joka</h1>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>,
  );
}
