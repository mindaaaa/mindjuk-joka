import { useMutation } from '@tanstack/react-query';

import { useAlbumStore } from '@/entities/album';
import { http } from '@/shared/api';
import { setAnalyticsUser, track } from '@/shared/lib/analytics';

export function useLogoutMutation() {
  const clearAlbum = useAlbumStore((s) => s.clear);

  return useMutation({
    mutationFn: () => http.post<void>('/v1/auth/logout'),
    meta: { operationId: 'auth_logout' },
    onSuccess: () => {
      clearAlbum();
      track('auth.logout');
      void setAnalyticsUser(null);
    },
  });
}
