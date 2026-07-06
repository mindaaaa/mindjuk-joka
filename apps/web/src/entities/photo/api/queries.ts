import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { photoKeys, type PhotoListFilters } from './keys';
import { toPhoto } from '../lib/mapper';
import type {
  InfiniteMedia,
  MediaDto,
  MediaListResponse,
  Photo,
} from '../model/types';

import { buildQuery, http } from '@/shared/api';
import { recordMediaListSlow } from '@/shared/lib/business-ux-logging';

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

/**
 * 업로드 직후 새 사진을 목록 캐시 맨 앞에 낙관적으로 끼워넣는다.
 * - 로컬 objectURL을 쓰므로 이 사진에 대한 별도 네트워크 요청은 없다.
 * - 실제 서버 데이터는 다음 정상 fetch가 교체한다.
 */
export function prependMediaToLists(
  queryClient: QueryClient,
  dto: MediaDto,
): void {
  queryClient.setQueriesData<InfiniteMedia>(
    { queryKey: photoKeys.lists() },
    (data) => {
      const first = data?.pages[0];
      if (!data || !first) return data;

      const exists = data.pages.some((page) =>
        page.items.some((it) => it.id === dto.id),
      );
      if (exists) return data;

      const updatedFirst: MediaListResponse = {
        ...first,
        items: [dto, ...first.items],
      };
      return { ...data, pages: [updatedFirst, ...data.pages.slice(1)] };
    },
  );
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
