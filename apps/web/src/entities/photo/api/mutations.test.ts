import { MutationObserver, QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  buildDeletePhotoOptions,
  buildUpdatePhotoMetaOptions,
} from './mutations';
import { photoKeys } from './keys';
import type { MediaDto, Photo } from '../model/types';

const mocks = vi.hoisted(() => ({
  patch: vi.fn(),
  del: vi.fn(),
}));

vi.mock('@/shared/api', () => ({
  http: { patch: mocks.patch, delete: mocks.del },
}));

function photo(overrides: Partial<Photo> = {}): Photo {
  return {
    id: 'p1',
    description: '원본 설명',
    state: 'COMPLETE',
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: { id: 'u1', name: '홍길동', email: 'u1@test.io' },
    ...overrides,
  };
}

function mediaDto(description: string): MediaDto {
  return {
    id: 'p1',
    description,
    state: 'COMPLETE',
    isFavorite: false,
    content: {
      location: { url: 's3://p1', accessUrl: 'https://signed/p1' },
      size: 10,
      eTag: 'e',
      mimeType: 'image/jpeg',
      thumbnail: null,
    },
    created: { at: '2026-01-01T00:00:00.000Z', by: photo().createdBy },
  };
}

function runUpdate(qc: QueryClient, vars: { id: string; description: string }) {
  return new MutationObserver(qc, buildUpdatePhotoMetaOptions(qc)).mutate(vars);
}

function runDelete(qc: QueryClient, id: string) {
  return new MutationObserver(qc, buildDeletePhotoOptions(qc)).mutate(id);
}

describe('buildUpdatePhotoMetaOptions', () => {
  let qc: QueryClient;

  beforeEach(() => {
    mocks.patch.mockReset();
    qc = new QueryClient();
    qc.setQueryData(photoKeys.detail('p1'), photo());
  });

  test('성공 시 상세 캐시 description이 갱신된다(낙관적 반영 유지)', async () => {
    mocks.patch.mockResolvedValueOnce(mediaDto('바뀐 설명'));

    await runUpdate(qc, { id: 'p1', description: '바뀐 설명' });

    expect(qc.getQueryData<Photo>(photoKeys.detail('p1'))?.description).toBe(
      '바뀐 설명',
    );
    expect(mocks.patch).toHaveBeenCalledWith('/v1/media/p1', {
      description: '바뀐 설명',
    });
  });

  // TODO: RTL 도입 시 활성화
  // - RTL 도입 후 `vi.waitFor`(또는 @testing-library/react의 waitFor)로 폴링해 검증 예정
  //
  // test('서버 응답 전에 캐시가 먼저 바뀐다(낙관적 반영의 즉시성)', async () => {
  //   // given: patch가 끝나지 않는 pending 상태
  //   let resolvePatch!: (dto: MediaDto) => void;
  //   mocks.patch.mockReturnValueOnce(
  //     new Promise<MediaDto>((resolve) => {
  //       resolvePatch = resolve;
  //     }),
  //   );
  //
  //   // when: mutate만 호출하고 응답은 아직 기다리지 않는다
  //   const settled = runUpdate(qc, { id: 'p1', description: '바뀐 설명' });
  //
  //   // then: patch가 pending인 동안 캐시가 먼저 바뀐다(서버 응답 전 즉시성)
  //   await vi.waitFor(() =>
  //     expect(qc.getQueryData<Photo>(photoKeys.detail('p1'))?.description).toBe(
  //       '바뀐 설명',
  //     ),
  //   );
  //
  //   resolvePatch(mediaDto('바뀐 설명'));
  //   await settled;
  // });

  test('실패 시 이전 값으로 롤백한다', async () => {
    mocks.patch.mockRejectedValueOnce(new Error('fail'));

    await expect(
      runUpdate(qc, { id: 'p1', description: '바뀐 설명' }),
    ).rejects.toThrow('fail');

    expect(qc.getQueryData<Photo>(photoKeys.detail('p1'))?.description).toBe(
      '원본 설명',
    );
  });

  test('성공 후 상세와 목록 쿼리를 무효화한다', async () => {
    mocks.patch.mockResolvedValueOnce(mediaDto('바뀐 설명'));
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    await runUpdate(qc, { id: 'p1', description: '바뀐 설명' });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: photoKeys.detail('p1'),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: photoKeys.lists() });
  });

  test('실패해도 상세와 목록 쿼리를 무효화한다', async () => {
    mocks.patch.mockRejectedValueOnce(new Error('fail'));
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    await expect(
      runUpdate(qc, { id: 'p1', description: '바뀐 설명' }),
    ).rejects.toThrow('fail');

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: photoKeys.detail('p1'),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: photoKeys.lists() });
  });
});

describe('buildDeletePhotoOptions', () => {
  beforeEach(() => mocks.del.mockReset());

  test('성공 시 상세 캐시를 제거하고 목록을 무효화한다', async () => {
    mocks.del.mockResolvedValueOnce(undefined);
    const qc = new QueryClient();
    qc.setQueryData(photoKeys.detail('p1'), photo());

    const remove = vi.spyOn(qc, 'removeQueries');
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    await runDelete(qc, 'p1');

    expect(mocks.del).toHaveBeenCalledWith('/v1/media/p1');
    expect(remove).toHaveBeenCalledWith({ queryKey: photoKeys.detail('p1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: photoKeys.lists() });
  });
});
