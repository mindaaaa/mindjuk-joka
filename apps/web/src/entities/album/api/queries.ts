import { useQuery } from '@tanstack/react-query';

import { albumKeys } from './keys';

import { http } from '@/shared/api';
import { AlbumListSchema } from '@/shared/api/schemas';

export function useAlbums(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: albumKeys.list(),
    queryFn: async () => {
      const response = await http.get('/v1/albums', {
        schema: AlbumListSchema,
      });
      return response.items;
    },
    staleTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
    retry: false,
    throwOnError: false,
    meta: { operationId: 'album_list' },
  });
}
