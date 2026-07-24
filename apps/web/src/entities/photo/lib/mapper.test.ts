import { describe, expect, test } from 'vitest';

import { toPhoto } from './mapper';
import type { MediaContent, MediaDto } from '../model/types';

function baseDto(overrides: Partial<MediaDto> = {}): MediaDto {
  return {
    id: 'media-1',
    description: '바다',
    state: 'COMPLETE',
    isFavorite: false,
    created: {
      at: '2026-01-01T00:00:00.000Z',
      by: { id: 'u1', name: '홍길동', email: 'a@b.com' },
    },
    ...overrides,
  };
}

const content: MediaContent = {
  location: { url: 's3://x', accessUrl: 'https://signed/x.jpg' },
  size: 1234,
  eTag: 'etag',
  mimeType: 'image/jpeg',
};

describe('toPhoto', () => {
  test('content가 있으면 원본 accessUrl을 imageUrl/downloadUrl에 함께 채운다', () => {
    const photo = toPhoto(baseDto({ content }));

    expect(photo.imageUrl).toBe('https://signed/x.jpg');
    expect(photo.downloadUrl).toBe('https://signed/x.jpg');
    expect(photo.mimeType).toBe('image/jpeg');
    expect(photo.size).toBe(1234);
  });

  test('content가 없으면 키 자체를 만들지 않는다', () => {
    const photo = toPhoto(baseDto({ state: 'PREPARING', content: undefined }));

    expect('imageUrl' in photo).toBe(false);
    expect('downloadUrl' in photo).toBe(false);
    expect('mimeType' in photo).toBe(false);
    expect('size' in photo).toBe(false);
  });

  test('DRAFT 상태(content 없음)도 안전하게 매핑한다', () => {
    const photo = toPhoto(baseDto({ state: 'DRAFT', content: undefined }));

    expect(photo.state).toBe('DRAFT');
    expect('imageUrl' in photo).toBe(false);
  });

  test('thumbnail이 있으면 목록용 thumbnailUrl·blurhash를 채우고 원본은 그대로 둔다', () => {
    const withThumb: MediaContent = {
      ...content,
      thumbnail: {
        location: { url: 's3://t', accessUrl: 'https://signed/thumb.jpg' },
        size: 100,
        eTag: 'te',
        mimeType: 'image/webp',
        blurhash: 'LKO2?U',
      },
    };
    const photo = toPhoto(baseDto({ content: withThumb }));

    // 목록 표시는 썸네일, 상세·다운로드는 원본
    expect(photo.thumbnailUrl).toBe('https://signed/thumb.jpg');
    expect(photo.blurhash).toBe('LKO2?U');
    expect(photo.imageUrl).toBe('https://signed/x.jpg');
    expect(photo.downloadUrl).toBe('https://signed/x.jpg');
  });

  test('thumbnail이 없으면(추출 전) thumbnailUrl/blurhash 키를 만들지 않는다', () => {
    const photo = toPhoto(baseDto({ content }));

    expect('thumbnailUrl' in photo).toBe(false);
    expect('blurhash' in photo).toBe(false);
    // 폴백: 목록도 원본 imageUrl을 쓸 수 있어야 한다
    expect(photo.imageUrl).toBe('https://signed/x.jpg');
  });

  test('공통 필드(createdAt/createdBy/isFavorite/state)를 매핑한다', () => {
    const photo = toPhoto(baseDto({ isFavorite: true }));

    expect(photo.id).toBe('media-1');
    expect(photo.state).toBe('COMPLETE');
    expect(photo.isFavorite).toBe(true);
    expect(photo.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(photo.createdBy).toEqual({
      id: 'u1',
      name: '홍길동',
      email: 'a@b.com',
    });
  });
});
