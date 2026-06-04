import { QueryClient } from '@tanstack/react-query';
import { describe, expect, test } from 'vitest';

import type { MediaDto, MediaListResponse } from '../model/types';
import { photoKeys } from './keys';
import { findPhotoInListCache, nextCursorOf, selectPhotos } from './queries';

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

    expect(findPhotoInListCache(qc, 'b')?.id).toBe('b');
  });

  test('정렬이 다른 여러 list 캐시를 순회해 찾는다', () => {
    const qc = new QueryClient();
    qc.setQueryData(photoKeys.list({ order: 'desc' }), {
      pages: [page([dto('a')])],
    });
    qc.setQueryData(photoKeys.list({ order: 'asc' }), {
      pages: [page([dto('b')])],
    });

    expect(findPhotoInListCache(qc, 'b')?.id).toBe('b');
  });

  test('data가 비어있는 캐시 항목이 섞여 있어도 안전하게 넘어간다', () => {
    const qc = new QueryClient();
    qc.setQueryData(photoKeys.list({ order: 'desc' }), undefined);
    qc.setQueryData(photoKeys.list({ order: 'asc' }), {
      pages: [page([dto('b')])],
    });

    expect(findPhotoInListCache(qc, 'b')?.id).toBe('b');
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
});
