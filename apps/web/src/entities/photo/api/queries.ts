import { useInfiniteQuery } from '@tanstack/react-query';

import { buildQuery, http } from '@/shared/api';
import { recordMediaListSlow } from '@/shared/lib/business-ux-logging';

import { toPhoto } from '../lib/mapper';
import type { MediaListResponse, Photo } from '../model/types';
import { photoKeys, type PhotoListFilters } from './keys';

const PAGE_SIZE = 20;

export function nextCursorOf(page: MediaListResponse): string | undefined {
  return page.pagination.hasNext
    ? (page.pagination.nextCursor ?? undefined)
    : undefined;
}

export function selectPhotos(
  data: { pages: MediaListResponse[] } | undefined,
): Photo[] {
  return (
    data?.pages
      .flatMap((page) => page.items)
      .filter((dto) => dto.content != null)
      .map(toPhoto) ?? []
  );
}

async function fetchPhotoPage(
  order: 'asc' | 'desc',
  cursor: string | undefined,
): Promise<MediaListResponse> {
  const path = `/v1/media${buildQuery({
    size: PAGE_SIZE,
    order,
    states: 'COMPLETE',
    cursor,
  })}`;

  const startedAt = performance.now();
  const response = await http.get<MediaListResponse>(path);
  recordMediaListSlow(performance.now() - startedAt, 'listMedia');

  return response;
}

export function usePhotosInfinite(
  filters?: PhotoListFilters,
  options?: { enabled?: boolean },
) {
  const order = filters?.order ?? 'desc';
  const initialCursor: string | undefined = undefined;

  return useInfiniteQuery({
    queryKey: photoKeys.list(filters),
    initialPageParam: initialCursor,
    queryFn: ({ pageParam }) => fetchPhotoPage(order, pageParam),
    getNextPageParam: nextCursorOf,
    enabled: options?.enabled ?? true, // 앨범이 준비된 뒤에만 조회
    staleTime: 60_000,
    throwOnError: true,
    meta: { operationId: 'listMedia' },
  });
}
