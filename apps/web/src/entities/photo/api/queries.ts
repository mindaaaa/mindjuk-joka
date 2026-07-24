import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { photoKeys, type PhotoListFilters } from './keys';
import { toPhoto } from '../lib/mapper';
import type {
  InfiniteMedia,
  MediaDto,
  MediaListResponse,
  Photo,
} from '../model/types';

import { buildQuery, http } from '@/shared/api';
import { MediaListSchema, MediaSchema } from '@/shared/api/schemas';
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

/**
 * 목록 조회 URL을 만든다.
 * - 즐겨찾기 필터는 켜졌을 때만 isFavorite=true를 붙인다
 * - 생략 시 전체 조회한다.
 */
export function mediaListPath(
  filters: { order: 'asc' | 'desc'; isFavorite?: boolean },
  cursor: string | undefined,
): string {
  return `/v1/media${buildQuery({
    size: PAGE_SIZE,
    order: filters.order,
    states: 'COMPLETE',
    isFavorite: filters.isFavorite ? 'true' : undefined,
    cursor,
  })}`;
}

async function fetchPhotoPage(
  filters: { order: 'asc' | 'desc'; isFavorite?: boolean },
  cursor: string | undefined,
): Promise<MediaListResponse> {
  const path = mediaListPath(filters, cursor);

  const startedAt = performance.now();
  const response = await http.get(path, { schema: MediaListSchema });
  recordMediaListSlow(performance.now() - startedAt, 'listMedia');

  return response;
}

/** 목록 캐시에서 찾은 Photo와, 그 데이터를 받아온 시각. */
export interface PhotoCacheHit {
  photo: Photo;
  dataUpdatedAt: number;
}

function isMediaListPage(value: unknown): value is MediaListResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    Array.isArray(value.items)
  );
}

function isPagedMedia(value: unknown): value is { pages: MediaListResponse[] } {
  if (typeof value !== 'object' || value === null) return false;
  if (!('pages' in value)) return false;

  return Array.isArray(value.pages) && value.pages.every(isMediaListPage);
}

/**
 * 이미 로드된 목록 캐시에서 id에 해당하는 Photo를 찾는다.
 * - 캐시가 없으면 undefined를 반환함
 * - dataUpdatedAt을 함께 반환해 호출자가 캐시 신선도를 판단할 수 있음
 */
export function findPhotoInListCache(
  queryClient: QueryClient,
  id: string,
): PhotoCacheHit | undefined {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: photoKeys.lists() });

  for (const query of queries) {
    const { data, dataUpdatedAt } = query.state;
    if (!isPagedMedia(data)) continue;

    const found = selectPhotos(data).find((photo) => photo.id === id);
    if (found) {
      return { photo: found, dataUpdatedAt };
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

/**
 * 삭제된 사진을 목록 캐시 전 페이지에서 즉시 걷어낸다.
 * - 삭제 후 목록으로 돌아왔을 때 백그라운드 리페치를 기다리며 유령 카드가 보이는 걸 막음
 * - 서버가 이미 404를 주는 상태(다른 기기에서 삭제됨)에서도 정리
 */
export function removeMediaFromLists(
  queryClient: QueryClient,
  id: string,
): void {
  queryClient.setQueriesData<InfiniteMedia>(
    { queryKey: photoKeys.lists() },
    (data) => {
      if (!data) return data;

      const exists = data.pages.some((page) =>
        page.items.some((it) => it.id === id),
      );
      if (!exists) return data;

      // 해당 사진이 없는 페이지는 참조를 유지해 불필요한 리렌더를 막는다.
      const pages = data.pages.map((page) =>
        page.items.some((it) => it.id === id)
          ? { ...page, items: page.items.filter((it) => it.id !== id) }
          : page,
      );
      return { ...data, pages };
    },
  );
}

async function fetchPhotoDetail(id: string): Promise<Photo> {
  const dto = await http.get(`/v1/media/${id}`, { schema: MediaSchema });
  return toPhoto(dto);
}

export function usePhotoDetail(id: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: photoKeys.detail(id),
    queryFn: () => fetchPhotoDetail(id),
    enabled: (options?.enabled ?? true) && !!id,
    initialData: () => findPhotoInListCache(queryClient, id)?.photo,
    initialDataUpdatedAt: () =>
      findPhotoInListCache(queryClient, id)?.dataUpdatedAt,
    staleTime: 60_000,
    throwOnError: true,
    meta: { operationId: 'getMedia' },
  });
}

/**
 * 이미지 로드에 실패한 사진 하나만 새 presigned URL(썸네일·원본)로 다시 받아온다.
 *
 * presigned 서명은 180초 만에 만료되므로, 목록을 오래 열어두고 스크롤하거나 상세를 재진입하면
 * 이미 죽은 URL로 요청이 나갈 수 있다. 그때 이 훅으로 그 사진만 재서명해 다시 그린다.
 *
 * - 목록 쿼리 무효화 대신 상세 조회로 그 사진만 재서명 (전체 재다운로드 방지)
 * - 부수 효과로 상세 캐시도 채워져, 그 사진 상세 진입이 빨라짐
 */
export function useRefreshPhotoUrls() {
  const queryClient = useQueryClient();

  return useCallback(
    (id: string): Promise<Photo> =>
      queryClient.fetchQuery({
        queryKey: photoKeys.detail(id),
        queryFn: () => fetchPhotoDetail(id),
        staleTime: 0, // 캐시를 건너뛰고 새 서명 URL을 받아야 한다
      }),
    [queryClient],
  );
}

export function usePhotosInfinite(
  filters?: PhotoListFilters,
  options?: { enabled?: boolean },
) {
  const order = filters?.order ?? 'desc';
  const isFavorite = filters?.isFavorite;
  const initialCursor: string | undefined = undefined;

  return useInfiniteQuery({
    queryKey: photoKeys.list(filters),
    initialPageParam: initialCursor,
    queryFn: ({ pageParam }) =>
      fetchPhotoPage({ order, ...(isFavorite && { isFavorite }) }, pageParam),
    getNextPageParam: nextCursorOf,
    enabled: options?.enabled ?? true, // 앨범이 준비된 뒤에만 조회
    staleTime: 60_000,
    throwOnError: true,
    meta: { operationId: 'listMedia' },
  });
}
