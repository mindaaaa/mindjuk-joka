import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { buildQuery, http } from '@/shared/api';
import { recordMediaListSlow } from '@/shared/lib/business-ux-logging';

import { toPhoto } from '../lib/mapper';
import type { MediaDto, MediaListResponse, Photo } from '../model/types';
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
  return (data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((dto) => dto.content != null)
    .map(toPhoto);
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

/**
 * 이미 로드된 목록 캐시(모든 list 쿼리)에서 id에 해당하는 Photo를 찾는다.
 * - 목록 → 상세 진입 시 단건 요청을 기다리지 않고 즉시 표시한다.
 * - 직접 진입(새로고침)처럼 캐시가 없으면 undefined를 반환해 정상 fetch로 넘어간다.
 */
export function findPhotoInListCache(
  queryClient: QueryClient,
  id: string,
): Photo | undefined {
  const entries = queryClient.getQueriesData<{ pages: MediaListResponse[] }>({
    queryKey: photoKeys.lists(),
  });

  for (const [, data] of entries) {
    const found = selectPhotos(data).find((photo) => photo.id === id);
    if (found) {
      return found;
    }
  }

  return undefined;
}

async function fetchPhotoDetail(id: string): Promise<Photo> {
  const dto = await http.get<MediaDto>(`/v1/media/${id}`);
  return toPhoto(dto);
}

export function usePhotoDetail(id: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: photoKeys.detail(id),
    queryFn: () => fetchPhotoDetail(id),
    enabled: (options?.enabled ?? true) && !!id,
    initialData: () => findPhotoInListCache(queryClient, id),
    staleTime: 60_000,
    throwOnError: true,
    meta: { operationId: 'getMedia' },
  });
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
