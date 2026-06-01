import { useMutation, useQueryClient } from '@tanstack/react-query';

import { http } from '@/shared/api';

import { authKeys } from './queries';

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => http.post<void>('/v1/auth/logout'),
    meta: { operationId: 'auth_logout' },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authKeys.all });
    },
  });
}
