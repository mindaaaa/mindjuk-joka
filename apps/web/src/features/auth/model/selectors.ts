import { useAuthStore } from './store';

export const useAuthUser = () => useAuthStore((s) => s.user);
export const useAuthStatus = () => useAuthStore((s) => s.status);
export const useIsAuthenticated = () =>
  useAuthStore((s) => s.status === 'authenticated');
