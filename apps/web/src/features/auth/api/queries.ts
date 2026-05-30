import { useQuery } from '@tanstack/react-query';

import type { User } from '@/entities/user';
import { http } from '@/shared/api';

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

export function useMe() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => http.get<User>('/v1/me'),
    staleTime: 30 * 60 * 1000,
    retry: false,
    throwOnError: false,
    meta: { operationId: 'auth_me' },
  });
}
