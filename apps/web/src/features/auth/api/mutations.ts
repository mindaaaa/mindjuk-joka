import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAlbumStore } from '@/entities/album';
import { http } from '@/shared/api';

import { authKeys } from './queries';

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const clearAlbum = useAlbumStore((s) => s.clear);

  return useMutation({
    mutationFn: () => http.post<void>('/v1/auth/logout'),
    meta: { operationId: 'auth_logout' },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authKeys.all });
      clearAlbum();
    },
  });
}
