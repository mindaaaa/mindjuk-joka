import { authTokenStore } from './auth-token';
import { createHttpClient } from './client';

export { buildQuery } from './query-string';

export const http = createHttpClient({
  onUnauthorized: () => {
    authTokenStore.clear();

    if (typeof window === 'undefined') return;
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  },
});
