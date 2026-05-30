import { create } from 'zustand';

import type { User } from '@/entities/user';
import { authTokenStore } from '@/shared/api/auth-token';

export type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  setUser: (user: User | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  setUser: (user) =>
    set({ user, status: user ? 'authenticated' : 'unauthenticated' }),
  reset: () => {
    authTokenStore.clear();
    set({ user: null, status: 'unauthenticated' });
  },
}));
