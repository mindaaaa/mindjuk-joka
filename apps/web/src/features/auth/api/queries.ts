import { useQuery } from '@tanstack/react-query';

import { authKeys } from './keys';

import type { User } from '@/entities/user';
import { http } from '@/shared/api';
import { MeSchema } from '@/shared/api/schemas';

export function useMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: (): Promise<User> => http.get('/v1/me', { schema: MeSchema }),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 60 * 1000,
    retry: false,
    throwOnError: false,
    meta: { operationId: 'auth_me' },
  });
}
