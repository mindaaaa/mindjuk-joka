import { QueryClient } from '@tanstack/react-query';
import { describe, expect, test } from 'vitest';

import { photoKeys } from './keys';
import {
  findPhotoInListCache,
  nextCursorOf,
  removeMediaFromLists,
  selectPhotos,
} from './queries';
import type { MediaDto, MediaListResponse } from '../model/types';

function page(
  items: MediaDto[],
  pagination: Partial<MediaListResponse['pagination']> = {},
): MediaListResponse {
  return {
    items,
    pagination: {
      size: 20,
      sortBy: 'CREATED_AT',
      order: 'DESC',
      hasNext: false,
      ...pagination,
    },
  };
}

function dto(id: string): MediaDto {
  return {
    id,
    description: id,
    state: 'COMPLETE',
    isFavorite: false,
    content: {
      location: { url: `s3://${id}`, accessUrl: `https://signed/${id}` },
      size: 1,
      eTag: 'e',
      mimeType: 'image/jpeg',
      thumbnail: null,
    },
    created: {
      at: '2026-01-01T00:00:00.000Z',
      by: { id: 'u', name: 'n', email: 'e' },
    },
  };
}

describe('nextCursorOf', () => {
  test('hasNext가 true면 nextCursor를 반환한다', () => {
    expect(nextCursorOf(page([], { hasNext: true, nextCursor: 'c2' }))).toBe(
      'c2',
    );
  });

  test('hasNext가 false면 nextCursor가 있어도 undefined (멈춤)', () => {
    expect(
      nextCursorOf(page([], { hasNext: false, nextCursor: 'c2' })),
    ).toBeUndefined();
  });

  test('hasNext가 true여도 nextCursor가 없으면 undefined (모순 응답 방어)', () => {
    expect(nextCursorOf(page([], { hasNext: true }))).toBeUndefined();
  });
});

describe('selectPhotos', () => {
  test('여러 페이지를 평탄화해 Photo[]로 매핑한다', () => {
    const data = { pages: [page([dto('a'), dto('b')]), page([dto('c')])] };
    const photos = selectPhotos(data);

    expect(photos.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(photos[0].imageUrl).toBe('https://signed/a');
  });

  test('빈 페이지가 섞여 있어도 항목만 이어붙인다', () => {
    const data = { pages: [page([dto('a')]), page([]), page([dto('b')])] };

    expect(selectPhotos(data).map((p) => p.id)).toEqual(['a', 'b']);
  });

  test('content 없는 항목은 제외한다', () => {
    const draft: MediaDto = { ...dto('d'), state: 'PREPARING', content: null };
    const data = { pages: [page([dto('a'), draft])] };
    const photos = selectPhotos(data);

    expect(photos.map((p) => p.id)).toEqual(['a']);
    expect(photos).toHaveLength(1);
  });

  test('data가 undefined면 빈 배열', () => {
    expect(selectPhotos(undefined)).toEqual([]);
  });
});

describe('findPhotoInListCache', () => {
  test('로드된 목록 캐시에서 id에 해당하는 Photo를 찾는다', () => {
    const qc = new QueryClient();
    qc.setQueryData(photoKeys.list({ order: 'desc' }), {
      pages: [page([dto('a'), dto('b')])],
    });

    expect(findPhotoInListCache(qc, 'b')?.photo.id).toBe('b');
  });

  test('정렬이 다른 여러 list 캐시를 순회해 찾는다', () => {
    const qc = new QueryClient();
    qc.setQueryData(photoKeys.list({ order: 'desc' }), {
      pages: [page([dto('a')])],
    });
    qc.setQueryData(photoKeys.list({ order: 'asc' }), {
      pages: [page([dto('b')])],
    });

    expect(findPhotoInListCache(qc, 'b')?.photo.id).toBe('b');
  });

  test('data가 비어있는 캐시 항목이 섞여 있어도 안전하게 넘어간다', () => {
    const qc = new QueryClient();
    qc.setQueryData(photoKeys.list({ order: 'desc' }), undefined);
    qc.setQueryData(photoKeys.list({ order: 'asc' }), {
      pages: [page([dto('b')])],
    });

    expect(findPhotoInListCache(qc, 'b')?.photo.id).toBe('b');
  });

  test('캐시에 id가 없으면 undefined(직접 진입 → normal fetch)', () => {
    const qc = new QueryClient();
    qc.setQueryData(photoKeys.list({ order: 'desc' }), {
      pages: [page([dto('a')])],
    });

    expect(findPhotoInListCache(qc, 'zzz')).toBeUndefined();
  });

  test('list 캐시가 하나도 없으면 undefined(루프를 돌지 않음)', () => {
    const qc = new QueryClient();

    expect(findPhotoInListCache(qc, 'a')).toBeUndefined();
  });

  // 상세 쿼리가 initialDataUpdatedAt으로 쓴다.
  // staleTime 동안 리페치를 건너뛰기 위함
  test('사진을 담고 있던 목록 캐시의 dataUpdatedAt을 함께 반환한다', () => {
    const qc = new QueryClient();
    qc.setQueryData(photoKeys.list({ order: 'desc' }), {
      pages: [page([dto('a')])],
    });

    const updatedAt = qc.getQueryState(
      photoKeys.list({ order: 'desc' }),
    )?.dataUpdatedAt;

    expect(findPhotoInListCache(qc, 'a')?.dataUpdatedAt).toBe(updatedAt);
  });
});

describe('removeMediaFromLists', () => {
  test('모든 페이지에서 해당 id를 걷어낸다', () => {
    const qc = new QueryClient();
    qc.setQueryData(photoKeys.list({ order: 'desc' }), {
      pages: [page([dto('a'), dto('b')]), page([dto('c')])],
      pageParams: [undefined, 'c2'],
    });

    removeMediaFromLists(qc, 'b');

    expect(
      selectPhotos(qc.getQueryData(photoKeys.list({ order: 'desc' }))).map(
        (p) => p.id,
      ),
    ).toEqual(['a', 'c']);
  });

  test('정렬이 다른 여러 list 캐시에서 모두 제거한다', () => {
    const qc = new QueryClient();
    qc.setQueryData(photoKeys.list({ order: 'desc' }), {
      pages: [page([dto('a'), dto('b')])],
      pageParams: [undefined],
    });
    qc.setQueryData(photoKeys.list({ order: 'asc' }), {
      pages: [page([dto('b'), dto('a')])],
      pageParams: [undefined],
    });

    removeMediaFromLists(qc, 'b');

    expect(findPhotoInListCache(qc, 'b')).toBeUndefined();
    expect(findPhotoInListCache(qc, 'a')?.photo.id).toBe('a');
  });

  test('pageParams는 보존한다(다음 페이지 요청이 깨지지 않게)', () => {
    const qc = new QueryClient();
    qc.setQueryData(photoKeys.list({ order: 'desc' }), {
      pages: [page([dto('a')]), page([dto('b')])],
      pageParams: [undefined, 'c2'],
    });

    removeMediaFromLists(qc, 'b');

    const data = qc.getQueryData<{ pages: unknown[]; pageParams: unknown[] }>(
      photoKeys.list({ order: 'desc' }),
    );
    expect(data?.pageParams).toEqual([undefined, 'c2']);
    expect(data?.pages).toHaveLength(2);
  });

  test('해당 사진이 없는 페이지는 참조를 그대로 둔다(불필요한 리렌더 방지)', () => {
    const qc = new QueryClient();
    const untouched = page([dto('a')]);
    qc.setQueryData(photoKeys.list({ order: 'desc' }), {
      pages: [untouched, page([dto('b')])],
      pageParams: [undefined, 'c2'],
    });

    removeMediaFromLists(qc, 'b');

    const data = qc.getQueryData<{ pages: MediaListResponse[] }>(
      photoKeys.list({ order: 'desc' }),
    );
    expect(data?.pages[0]).toBe(untouched);
    expect(data?.pages[1].items).toEqual([]);
  });

  test('없는 id면 캐시 참조를 그대로 둔다(불필요한 리렌더 방지)', () => {
    const qc = new QueryClient();
    const before = {
      pages: [page([dto('a')])],
      pageParams: [undefined],
    };
    qc.setQueryData(photoKeys.list({ order: 'desc' }), before);

    removeMediaFromLists(qc, 'zzz');

    expect(qc.getQueryData(photoKeys.list({ order: 'desc' }))).toBe(before);
  });

  test('list 캐시가 없어도 안전하다', () => {
    const qc = new QueryClient();

    expect(() => removeMediaFromLists(qc, 'a')).not.toThrow();
  });
});
