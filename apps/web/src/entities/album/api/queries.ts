import { useQuery } from '@tanstack/react-query';

import { http } from '@/shared/api';

import type { Album } from '../model/types';
import { albumKeys } from './keys';

interface AlbumListResponse {
  items: Album[];
}

export function useAlbums(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: albumKeys.list(),
    queryFn: async () => {
      const response = await http.get<AlbumListResponse>('/v1/albums');
      return response.items;
    },
    staleTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
    retry: false,
    throwOnError: false,
    meta: { operationId: 'album_list' },
  });
}
